import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { questionAvailability, type DailyPlan, type LearningPack } from '@408os/domain';
import { parseLearningPack } from '@408os/content-schema';
import { storage, CONTENT_PACK_CACHE_NAME } from './storage';
import { useStudy } from './StudyContext';
import { useBeijingDate } from './useBeijingDate';
import { empty, LearningContext } from './LearningContext';
import { SERVER_MODE } from './server-mode';
import { api } from './api';
import { loadServerLearningContent } from './server-learning';

export function LearningProvider({ children }: { children: ReactNode }) {
  const { loading, contentReady, questions, attempts, assets } = useStudy();
  const date = useBeijingDate();
  const [snapshot, setSnapshot] = useState(empty);
  const [pack, setPack] = useState<LearningPack | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [packLoading, setPackLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => storage.reviewRepository.subscribe(setSnapshot, (reason) => setError(`读取复习数据失败：${String(reason)}`)), []);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (SERVER_MODE) {
          const candidate = await loadServerLearningContent();
          if (active && candidate) setPack(candidate);
          return;
        }
        let response: Response;
        try { response = await fetch('/content/learning.json?__408os_validate=learning', { cache: 'no-store', credentials: 'same-origin' }); }
        catch {
          const installed = await storage.learningContentRepository.get();
          if (!installed) throw new Error('离线学习包不可用，请联网安装后重试。');
          if (active) setPack(parseLearningPack(installed));
          return;
        }
        if (!response.ok) throw new Error(`学习内容包不可用（HTTP ${response.status}）`);
        const candidate = parseLearningPack(await response.clone().json());
        await storage.learningContentRepository.install(candidate);
        if (active) setPack(candidate);
        if ('caches' in globalThis) {
          try { await (await caches.open(CONTENT_PACK_CACHE_NAME)).put('/content/learning.json', response); }
          catch { /* IndexedDB already retains the validated independent pack. */ }
        }
      } catch (reason) { if (active) setError(String(reason)); }
      finally { if (active) setPackLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  const availableCards = useMemo(() => {
    if (!pack) return [];
    const versions = new Map(questions.map((question) => [question.id, question.contentVersion]));
    return pack.cards.filter((card) => card.sources.every((source) => versions.get(source.questionId) === source.questionContentVersion));
  }, [pack, questions]);
  const mappedQuestions = useMemo(() => {
    const mappings = new Map(pack?.mappings.map((mapping) => [mapping.questionId, mapping]));
    return questions.flatMap((question) => {
      const mapping = mappings.get(question.id);
      return mapping?.questionContentVersion === question.contentVersion && questionAvailability(question, assets).practice ? [{ ...question, subject: mapping.subject }] : [];
    });
  }, [pack, questions, assets]);
  useEffect(() => {
    if (loading || contentReady === false || packLoading || !pack || !questions.length) return;
    let active = true;
    const loadPlan = async () => {
      if (!SERVER_MODE) return storage.reviewRepository.dailyPlan(mappedQuestions, attempts, availableCards, new Date().toISOString());
      const existing = await storage.reviewRepository.getDailyPlan(date);
      if (existing) return existing;
      if (!navigator.onLine) return null;
      return storage.reviewRepository.saveServerPlan(await api('/plans/today', {}));
    };
    void loadPlan().then(
      (value) => { if (active) setPlan(value); },
      (reason: unknown) => { if (active) setError(`保存今日计划失败：${String(reason)}`); },
    );
    return () => { active = false; };
  }, [date, loading, contentReady, packLoading, pack, questions, mappedQuestions, attempts, availableCards, snapshot.events, snapshot.personal]);
  return <LearningContext.Provider value={{ ...snapshot, pack, plan: plan?.date === date ? plan : null, loading: packLoading || loading || contentReady === false, error }}>{children}</LearningContext.Provider>;
}

