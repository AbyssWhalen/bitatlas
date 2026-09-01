import { GitBranch, GitFork, Layers3, ListChecks, ListTree, Network, TreePine, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

export type DataStructuresModule = 'shortest-path' | 'linked-list' | 'stack-capacity' | 'min-heap' | 'tree-traversal' | 'forest-conversion' | 'sort-pass' | 'complete-tree';

export function DataStructuresModuleTabs({ active }: { active: DataStructuresModule }) {
  return (
    <nav className="lab-tabs ds-module-tabs" aria-label="数据结构实验模块">
      <Link
        to="/lab/data-structures?module=shortest-path&preset=cn408-2009-q41"
        className={active === 'shortest-path' ? 'active' : ''}
        aria-current={active === 'shortest-path' ? 'page' : undefined}
      >
        <Network size={17} aria-hidden="true" />最短路径
      </Link>
      <Link
        to="/lab/data-structures?module=forest-conversion&preset=cn408-2009-q06&path=LR"
        className={active === 'forest-conversion' ? 'active' : ''}
        aria-current={active === 'forest-conversion' ? 'page' : undefined}
      >
        <GitFork size={17} aria-hidden="true" />森林转换
      </Link>
      <Link
        to="/lab/data-structures?module=linked-list&preset=cn408-2009-q42"
        className={active === 'linked-list' ? 'active' : ''}
        aria-current={active === 'linked-list' ? 'page' : undefined}
      >
        <ListTree size={17} aria-hidden="true" />单链表双指针
      </Link>
      <Link
        to="/lab/data-structures?module=stack-capacity&preset=cn408-2009-q02"
        className={active === 'stack-capacity' ? 'active' : ''}
        aria-current={active === 'stack-capacity' ? 'page' : undefined}
      >
        <Layers3 size={17} aria-hidden="true" />栈容量
      </Link>
      <Link
        to="/lab/data-structures?module=min-heap&preset=cn408-2009-q09"
        className={active === 'min-heap' ? 'active' : ''}
        aria-current={active === 'min-heap' ? 'page' : undefined}
      >
        <GitBranch size={17} aria-hidden="true" />小根堆插入
      </Link>
      <Link
        to="/lab/data-structures?module=tree-traversal&preset=cn408-2009-q03&order=RNL"
        className={active === 'tree-traversal' ? 'active' : ''}
        aria-current={active === 'tree-traversal' ? 'page' : undefined}
      >
        <Workflow size={17} aria-hidden="true" />二叉树遍历
      </Link>
      <Link
        to="/lab/data-structures?module=complete-tree&preset=cn408-2009-q05"
        className={active === 'complete-tree' ? 'active' : ''}
        aria-current={active === 'complete-tree' ? 'page' : undefined}
      >
        <TreePine size={17} aria-hidden="true" />完全树极值
      </Link>
      <Link
        to="/lab/data-structures?module=sort-pass&preset=cn408-2009-q10"
        className={active === 'sort-pass' ? 'active' : ''}
        aria-current={active === 'sort-pass' ? 'page' : undefined}
      >
        <ListChecks size={17} aria-hidden="true" />趟次判别
      </Link>
    </nav>
  );
}
