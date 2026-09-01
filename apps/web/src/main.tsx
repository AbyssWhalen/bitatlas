import { lazy, StrictMode, Suspense, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { StudyProvider } from './app/StudyContext';
import { AppShell } from './components/AppShell';
import './styles.css';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ContentReviewPage = lazy(() => import('./pages/ContentReviewPage').then((module) => ({ default: module.ContentReviewPage })));
const CpuLabPage = lazy(() => import('./pages/CpuLabPage').then((module) => ({ default: module.CpuLabPage })));
const DataStructuresLabPage = lazy(() => import('./pages/DataStructuresLabPage').then((module) => ({ default: module.DataStructuresLabPage })));
const DocumentLibraryPage = lazy(() => import('./pages/DocumentLibraryPage').then((module) => ({ default: module.DocumentLibraryPage })));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage').then((module) => ({ default: module.KnowledgePage })));
const MockExamPage = lazy(() => import('./pages/MockExamPage').then((module) => ({ default: module.MockExamPage })));
const MockExamSessionPage = lazy(() => import('./pages/MockExamSessionPage').then((module) => ({ default: module.MockExamSessionPage })));
const NetworkLabRouterPage = lazy(() => import('./pages/NetworkLabRouterPage').then((module) => ({ default: module.NetworkLabRouterPage })));
const PdfReaderPage = lazy(() => import('./pages/PdfReaderPage').then((module) => ({ default: module.PdfReaderPage })));
const PracticePage = lazy(() => import('./pages/PracticePage').then((module) => ({ default: module.PracticePage })));
const QuestionsPage = lazy(() => import('./pages/QuestionsPage').then((module) => ({ default: module.QuestionsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then((module) => ({ default: module.StatsPage })));
const OsLabRouterPage = lazy(() => import('./pages/OsLabRouterPage').then((module) => ({ default: module.OsLabRouterPage })));
const WrongPage = lazy(() => import('./pages/WrongPage').then((module) => ({ default: module.WrongPage })));

function route(element: ReactNode) {
  return <Suspense fallback={<section className="loading-state"><span className="loader" /><p>载入页面</p></section>}>{element}</Suspense>;
}

const router = createBrowserRouter([
  { path: '/review/2009', element: route(<ContentReviewPage />) },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: route(<DashboardPage />) },
      { path: 'questions', element: route(<QuestionsPage />) },
      { path: 'mock', element: route(<MockExamPage />) },
      { path: 'mock/:examId', element: route(<MockExamSessionPage />) },
      { path: 'wrong', element: route(<WrongPage />) },
      { path: 'knowledge', element: route(<KnowledgePage />) },
      { path: 'lab', element: route(<CpuLabPage />) },
      { path: 'lab/data-structures', element: route(<DataStructuresLabPage />) },
      { path: 'lab/os-memory', element: route(<OsLabRouterPage />) },
      { path: 'lab/network', element: route(<NetworkLabRouterPage />) },
      { path: 'documents', element: route(<DocumentLibraryPage />) },
      { path: 'documents/:documentId', element: route(<PdfReaderPage />) },
      { path: 'stats', element: route(<StatsPage />) },
      { path: 'settings', element: route(<SettingsPage />) },
      { path: 'practice/:sessionId', element: route(<PracticePage />) },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudyProvider><RouterProvider router={router} /></StudyProvider>
  </StrictMode>,
);
