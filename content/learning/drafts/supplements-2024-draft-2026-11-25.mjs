// 2024 年 40 道缺文字解析单选题的补充解析草稿（AI 辅助 · 待审核）。
// 尚未并入学习包；答案键严格以 2024.json 及 answers-1.jpg 总表为准，不能替代人工审核。
export const questionSupplementDrafts2024 = [
  {
    "id": "supplement:cn408-2024-q01",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q01",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。先用 q=p->next 让 q 指向 p 的直接后继结点（因 p 非尾结点，q 非空）；再由 p->next=q->next 将 q 从原位置摘下并保持链表不断链；最后 q->next=h->next; h->next=q; 采用头插法将结点 q 插入到头结点 h 之后，使其成为新的首元结点。因此整体效果是将 q 所指结点移动到头结点之后。\n其他选项：A、B 将摘除后头插误判为在 p 或 q 之后插入（且 q 原本就在 p 之后）；C 误认为移动的是 p，实际上 p 的前驱指针并未改动，移动的是 p 的原后继 q。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q01",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 1"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q01",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 1"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q02",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q02",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。按运算符优先级（括号高于乘除、乘除高于加减）及同级左结合规则，原式加全括号为 (x + ((y * (z - u)) / v))：先算括号内 z - u 得 zu-，再算与 y 的乘法得 yzu-*，接着按从左到右结合算除以 v 得 yzu-*v/，最后与 x 相加得 xyzu-*v/+。\n其他选项：B（xyzu-v/*+）先算了 (z - u) / v 再乘 y，违背了 * 与 / 同优先级从左向右结合的规则；C、D 将运算符写在操作数之前，属于前缀表达式形态而非后缀表达式。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q02",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 2"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q02",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 2"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q03",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q03",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。中序遍历次序为“左子树→根→右子树”，且已知 v 同时有左孩子和右孩子（左、右子树均非空）。因此中序序列中紧邻 v 之前的前驱 p 必是 v 左子树中最后被访问的结点（最右下结点），若 p 有右孩子，则访问完 p 后须先遍历其右子树才到 v，p 与 v 不可能相邻；同理，紧邻 v 之后的后继 q 必是 v 右子树中最先被访问的结点（最左下结点），若 q 有左孩子，则访问 q 前须先遍历其左子树，v 与 q 也不可能相邻。故 p 无右孩子、q 无左孩子。\n其他选项：B、D 假设 q 有左孩子，C、D 假设 p 有右孩子，均会在 p、v 或 v、q 之间插入其他结点，与序列“… , p, v, q, …”矛盾。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q03",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 3"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q03",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 3"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q04",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q04",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。无向图的邻接多重表中，每条无向边只用一个边结点表示，顶点的度等于其编号在所有边结点的两个顶点域（ivex, jvex）中出现的总次数。对照题 4 图，顶点编号为 0:a、1:b、2:c、3:d、4:e，图中共有 7 个边结点，顶点对依次为 (0,1)、(0,3)、(1,3)、(2,0)、(3,2)、(4,2)、(4,3)。编号 1（顶点 b）出现在 (0,1) 和 (1,3) 共 2 个边结点中，度为 2；编号 3（顶点 d）出现在 (0,3)、(1,3)、(3,2)、(4,3) 共 4 个边结点中，度为 4。\n其他选项：A（0, 2）只数了部分直接出指或漏计了通过 jvex 关联的边；C（2, 5）和 D（3, 4）混淆了邻接多重表指针链与普通邻接表，重复计入了边。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q04",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 4"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q04",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 4"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q05",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q05",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。直接使用折半查找必须同时具备“按关键字有序”和“支持 O(1) 按下标随机定位中点”两个条件。II（无序数组）和 IV（无序静态链表）不满足有序性，比较中点后无法排除一半元素；I（有序链表）靠指针寻址，定位中点需从头顺序遍历；III（有序静态链表）虽借用数组存储，但数组下标仅代表物理槽位，元素的有序逻辑次序由游标链维系，无法用 (low+high)/2 直接算出逻辑中点的下标。故 I、II、III、IV 均不适合直接使用折半查找。\n其他选项：A 漏选无序结构 II、IV；B 误认为只要关键字有序，链式结构 I、III 也能直接折半查找；C 漏排除了不支持随机访问的有序动态链表 I。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q05",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 5"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q05",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 5"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q06",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q06",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。按位序 1～6 记模式串 S=“aabaab”，先求普通 next 数组为 [0, 1, 2, 1, 2, 3]；再按 S[j]==S[next[j]] 时继承 nextval[next[j]] 的规则求修正后的 nextval 数组：j=1 为 0；j=2（a==S[1]）为 0；j=3（b≠S[2]）为 2；j=4（a==S[1]）为 0；j=5（a==S[2]）为 0；j=6（b==S[3]）为 2，即 nextval=[0, 0, 2, 0, 0, 2]。当主串 T[i] 与 S[j] 失配时，模式串向右滑动的距离为 j−nextval[j]（若 nextval[j]=0，则 S[1] 直接滑到 T[i+1] 对齐，滑动距离为 j−0=j）。遍历 j=1～6 得滑动距离依次为 1, 2, 1, 4, 5, 4，故在 j=5 处失配（如主串前 5 位为“aabac”）时向右滑动距离最长，为 5−0=5。\n其他选项：B（4）仅算到 j=4 或 j=6 的滑动距离 4，漏了 j=5 时因连续相同字符修正使 nextval[5]=0 带来的距离 5；C（3）误用了未修正的普通 next 数组（max(j−next[j])=5−2=3）；D（2）混淆了 nextval 的取值与滑动距离。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q06",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 6"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q06",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 6"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q07",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q07",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。由二叉搜索树定义，任一结点左子树中的所有关键字均小于该结点关键字，右子树中的所有关键字均大于该结点关键字。对照题 7 图：k2 在 k1 的右子树中，k3 在 k2 的左子树中（故 k1 < k3 < k2），而子树 T 位于 k3 的右子树中。沿着从根到 T 的路径，x 在 k1 右子树故 x > k1，在 k2 左子树故 x < k2，在 k3 右子树故 x > k3；合并三个不等式（因 k3 > k1）得紧上下界 k3 < x < k2。\n其他选项：A（x < k1）对应 k1 的左子树；B（x > k2）对应 k2 的右子树；C（k1 < x < k3）对应 k3 的左子树而非右子树 T。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q07",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 7"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q07",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          1,
          2
        ],
        "locator": "PDF page 1, 2; question 7"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q08",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q08",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。快速排序第一趟划分将枢轴放到最终位置，使一侧子块 P 的元素都不大于（或都不小于）枢轴、另一侧子块 Q 的元素都不小于（或都不大于）枢轴，因此 P 中任意元素与 Q 中任意元素之间的大小关系已经确定，即 P 和 Q 块间有序。\n其他选项：B 错误，单趟划分只排好枢轴一个元素，P、Q 两块内部仍可能无序；C 错误，P、Q 元素个数取决于所选枢轴在原数组中的大小名次，若枢轴接近极值则两块规模悬殊；D 错误，快速排序允许数组中存在相等关键字，P、Q 内外都可能含有相等元素。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q08",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 8"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q08",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 8"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q09",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q09",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。初始大根堆按层下标 1～8 为 [28, 22, 20, 19, 8, 12, 15, 5]。第一次删除堆顶 28：将末元素 5 移至根得 [5, 22, 20, 19, 8, 12, 15]，5 与左右孩子 22、20 中的较大者 22 交换，再与新左右孩子 19、8 中的较大者 19 交换，调整为 [22, 19, 20, 5, 8, 12, 15]。第二次删除堆顶 22：将当前末元素 15 移至根得 [15, 19, 20, 5, 8, 12]，根 15 的左右孩子为 19（下标 2）和 20（下标 3），应与较大者 20 交换到下标 3；此时下标 3 仅有左孩子 12（下标 6），满足 15 ≥ 12，筛选停止，得到新堆 [20, 19, 15, 5, 8, 12]。\n其他选项：A 把剩余 6 个元素直接按降序排列而非按堆删除规则调整；C 在第二次下滤时误将 15 与较小的左孩子 19 比较或放错子树；D 直接去掉前两个元素，未执行堆尾元素移至根并向下筛选的步骤。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q09",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 9"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q09",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 9"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q10",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q10",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。按从左至右依次做二路归并：第一步归并 (3, 5) 与 (7, 9)，依次比较 3<7（输出 3）、5<7（输出 5），共比较 2 次后左表耗尽，右表剩余的 7、9 直接复制到末尾无须再比较，得到 (3, 5, 7, 9)。第二步归并 (3, 5, 7, 9) 与 (6)，依次比较 3<6（输出 3）、5<6（输出 5）、7>6（输出 6），共比较 3 次后右表 (6) 耗尽，左表剩余的 7、9 直接接在末尾。两次归并关键字总比较次数为 2 + 3 = 5 次。\n其他选项：A（3）漏计了第一步归并的 2 次比较；B（4）在第二步漏算了 7 与 6 的比较；D（6）在一侧子表已空后仍多算了剩余元素的比较次数。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q10",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 10"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q10",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 10"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q11",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q11",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。对初始为升序的归并段做多路平衡归并时，每轮需选出当前各归并段队首中的最小关键字输出，故较小者为“胜者”、较大者为“败者”。在 408 采用的败者树结构中，叶结点数组存放各归并段当前参与比较的关键字，而所有内部结点（记录各场败者）以及最顶端的总冠军结点 ls[0] 保存的都是对应记录所在的归并段号（叶结点下标），以便输出最小元素后能直接从该段读入下一个元素并自底向上调整。因此记录“冠军”的结点保存的是最小关键字所在的归并段号。\n其他选项：A、C 误将升序归并的冠军当成最大关键字；B 误认为冠军结点直接保存关键字数值而非归并段号（仅存数值无法直接定位待补充元素的归并段）。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q11",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 11"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q11",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 11"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q12",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q12",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。按 408 默认的 32 位 int、16 位 short 补码表示：32777 = 32768 + 9 = 2¹⁵ + 9，其 32 位补码为 0000 8009H。执行 short si = i 时截取低 16 位得 8009H（二进制 1000 0000 0000 1001B），最高位符号位为 1，按 16 位带符号补码解释真值为 32777 − 2¹⁶ = 32777 − 65536 = −32759。随后执行 int j = si，由 short 转为 int 执行符号扩展（高 16 位全补 1 得 FFFF 8009H），真值不变，故 j = −32759。\n其他选项：A（−32777）误把补码最高位 1 当作原码符号位直接添负号；C（32759）忽略了最高位为 1 代表负数；D（32777）忽略了 16 位 short 上界为 32767、赋值已发生截断变号。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q12",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 12"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q12",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 12"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q13",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q13",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。III（机器指令）是由二进制 0/1 编码构成的机器级指令，CPU 取指译码后可直接理解并执行；II（微指令）在采用微程序控制器的 CPU 内部由控制存储器给出，直接产生微操作控制信号驱动数据通路，同样由 CPU 硬件直接理解并执行。因此仅 II 和 III 正确。\n其他选项：I（伪指令）和 IV（汇编指令）均属于助记符层次的汇编语言源程序内容，CPU 硬件无法直接识别，必须先经汇编程序翻译成机器指令序列（部分伪指令仅指导汇编过程甚至不产生机器指令）后才能执行，故含 I 或 IV 的 A、C、D 均错误。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q13",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 13"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q13",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 13"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q14",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q14",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。题目要求对整型参数“保证表数精度（不因舍入丢失整数低位）”且“提高运算速度”。α 取值范围为 −2²⁰～2²⁰，32 位带符号补码整数范围为 −2³¹～2³¹−1，可完全精确覆盖 α，且定点整数运算比浮点运算更快，故 α 最宜用 32 位整数。β 取值范围为 −2⁴⁰～2⁴⁰，超出了 32 位整数表示范围；IEEE 754 单精度浮点数仅有 1 位隐含位加 23 位尾数共 24 位有效位，只能精确表示绝对值不超过 2²⁴ 的全部连续整数，表示 ±2⁴⁰ 内的整数会舍入丢精度；而双精度浮点数含 1 位隐含位加 52 位尾数共 53 位有效位（53 > 40），可精确无损表示 −2⁵³～2⁵³ 内的每一个整数，故 β 应选双精度浮点数。\n其他选项：A 对 β 用 32 位整数会溢出；B 对 β 用单精度浮点数会丧失低位整数精度；D 对 α 用单精度浮点数虽能保精度，但运算速度不及 32 位定点整数。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q14",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 14"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q14",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 14"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q15",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q15",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。即使机器指令集没有硬件乘法指令，两个整型变量的乘法运算也可以由编译器转换为一段循环程序，利用移位、加法、比较与条件转移指令逐位累加实现，因此 D 称“无法编译转换为移位及加法等指令的循环实现”是错误的。\n其他选项：A 正确，阵列乘法器由纯组合逻辑阵列并行构成，可在 1 个时钟周期内完成乘法；B 正确，复用单个 ALU 和移位器做乘法需要按位循环迭代，必须耗费多个时钟周期；C 正确，变量乘常数（如 x×9 拆为 (x<<3)+x）可在编译阶段优化为若干条移位和加/减指令。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q15",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 15"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q15",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 15"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q16",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q16",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。在页式虚拟存储系统中，主存–外存层次缺页访问外存的时间开销极大，为最大限度降低缺页率，采用全相联映射方式（任一虚拟页可装入任一空闲物理页框，由页表记录映射），而不是冲突率很高的直接映射方式；Cache–主存层次则可采用直接映射、组相联或全相联。故 D 后半句错误。\n其他选项：A 正确，Cache–主存以主存块为单位交换，主存–外存以页为单位交换；B 正确，Cache 替换由硬件电路实现，页面置换由操作系统软件实现；C 正确，Cache 可用回写法，而主存–外存因磁盘写极慢，通常采用回写法（淘汰修改过的脏页时才写回外存）。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q16",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 16"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q16",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 16"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q17",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q17",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。按字节编址，页大小为 1KB = 2¹⁰B，故页内偏移占 10 位；虚拟地址为 32 位，则虚页号占 32 − 10 = 22 位。TLB 共 32 个表项、采用 4 路组相联映射，共分为 32 ÷ 4 = 8 = 2³ 组，需用虚页号中的 3 位作 TLB 组索引，剩余 22 − 3 = 19 位作为 TLB 表项的标记（Tag）字段。\n其他选项：A（17）误用 30 位主存物理地址减去 10 和 3（TLB 按虚拟页号查找，标记位数由虚拟地址决定而非主存地址）；B（18）误算成 16 组（4 位组号）或 2KB 页；D（20）误按 4KB 页（12 位偏移）且未扣除组索引位计算。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q17",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 17"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q17",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 17"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q18",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q18",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。MMU（内存管理单元）负责把虚拟地址转换为物理地址，并检查页表项/TLB 项的存在位与权限位：在查快表时可检测 TLB 缺失（D），查页表存在位为 0 时检测页面缺失即缺页异常（C），核对读/写/执行或特权级保护位不符时检测访问越权异常（A）。而 Cache 缺失（B）是在用地址访问高速缓存时由 Cache 控制器比对行有效位和标记检测的，不属于 MMU 地址转换过程检测的事件。\n其他选项：A、C、D 均发生在 MMU 查询 TLB 与页表完成虚实地址转换及权限校验的过程中。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q18",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 18"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q18",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          2,
          3
        ],
        "locator": "PDF page 2, 3; question 18"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q19",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q19",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。转发（旁路）电路只能提前传送已经产生的结果。在“取指、译码/取数、执行、访存、写回”五段流水线中，若前一条 load 指令在访存（MEM）段结束时才从存储器读出数据，而紧邻的后一条指令在执行（EX）段开始就要使用该寄存器值（load-use 数据冒险），所需数据尚未产生，仅靠转发电路无法消除该冲突，必须配合硬件阻塞（插气泡）或指令重排/插 nop。因此 C 叙述错误。\n其他选项：A 正确，相邻指令间的写后读（RAW）相关可引发数据冒险；B 正确，插入气泡推迟后续指令执行可避免读错旧值；D 正确，编译期调整无关指令顺序或插入足够 nop 指令拉开间隔，可解决所有数据冒险。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q19",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 19"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q19",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 19"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q20",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q20",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。按 408 教材定义，总线带宽即总线本身的最大数据传输率（峰值带宽），等于总线数据传输频率乘每次传输的字节数：时钟频率 420MHz、每时钟周期传 2 次、总线宽 64 位（8B），故总线带宽 = 420×10⁶ × 2 × (64÷8) B/s = 6720×10⁶ B/s = 6.72GB/s（这里 G 按 10⁹ 计；题干给出的第 1、4～7 周期属于单次突发事务的时序开销，用于求单次非流水事务的有效数据传输率，不改变总线本身的峰值带宽定义）。\n其他选项：A（3.84GB/s）按 7 个时钟周期传 64B 计算（6.72×4/7=3.84GB/s），求的是单次突发事务不重叠时的有效数据传输率而非总线最大数据传输率；C（30.72GB/s）和 D（53.76GB/s）未将 64bit 除以 8 换算成字节，把 Gb/s 数值误作 GB/s。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q20",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 20"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q20",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 20"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "本题“总线带宽（最大数据传输率）”存在峰值带宽（6.72GB/s，答案键 B）与计入地址及等待周期的单事务有效数据传输率（3.84GB/s，选项 A）两种易混口径；答案键 B 采用教材峰值带宽定义（或地址/数据分离总线的流水满载速率），建议审阅时确认是否需补充分离式总线流水重叠说明。"
    ]
  },
  {
    "id": "supplement:cn408-2024-q21",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q21",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。中断优先级分为响应优先级和处理优先级：中断响应优先级由硬件判优排队电路固定决定，用于裁决同时到达的多个未屏蔽中断先响应谁；中断屏蔽字则是通过屏蔽特定中断源，动态改变某中断服务程序执行期间允许谁打断嵌套，即用于改变中断处理优先级而非中断响应优先级。故 A 错误。\n其他选项：B 正确，在中断响应阶段，由硬件中断隐指令自动保存断点（PC）和程序状态字（PSW）；C 正确，进入中断服务程序后，保护通用寄存器现场与设置新的中断屏蔽字由中断服务程序（软件）完成；D 正确，单重中断不允许中断嵌套，中断处理全程保持关中断，返回前才开中断。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q21",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 21"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q21",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 21"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q22",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q22",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。DMA（直接存储器访问）方式在设备接口（I/O 接口/设备控制器）与主存之间建立直接数据传输通路，由 DMA 控制器申请总线使用权后直接在设备接口和主存之间成块传送数据，数据不必经过 CPU 内部寄存器中转。\n其他选项：A、B 误以为 DMA 数据传输仍需流经 CPU（CPU 仅在传送前后负责初始化 DMA 参数与处理完成中断，不参与中间数据搬运）；D 将传输终点误限在 DMA 控制器内部，忽略了 DMA 的目标是与主存直接交换数据。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q22",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 22"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q22",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 22"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q23",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q23",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。要区分事件“发生时”与处理程序“执行时”的特权级：CPU 在用户态执行应用程序时，完全可能发生外部 I/O 中断、时钟中断，或因指令除零、缺页等触发异常；事件发生后，才由硬件响应机制把 CPU 从用户态切换到内核态。因此中断或异常并非只能在内核态下发生，A 错误。\n其他选项：B 正确，每个系统调用都对应内核中的一个服务例程；C 正确，硬件响应已完成模式切换，故中断处理程序开始执行时 CPU 必处于内核态；D 正确，新增设备类型时需在内核中注册对应的中断服务例程入口以响应其硬件中断。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q23",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 23"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q23",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 23"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q24",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q24",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。操作系统终止一个进程时，是否一并终止其子进程取决于具体系统设计：部分系统采用级联终止，而 UNIX/Linux 等常见操作系统允许子进程继续运行，将其过继给 init/systemd 等祖先进程收养，因此“终止子进程”不一定执行。\n其他选项：B（回收占用的设备）、C（撤销作为进程唯一存在标志的 PCB）、D（回收分配的内存空间）都是销毁该进程实体、释放其自身资源所必须执行的操作。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q24",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 24"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q24",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 24"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q25",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q25",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。在页式存储管理系统中切换进程时，新旧进程具有各自独立的指令执行流、运行栈和虚拟地址空间：I 更新程序计数器（PC）以恢复新进程的指令执行位置；II 更新栈基址寄存器（及栈指针）以切换到新进程的栈上下文；III 更新页表基地址寄存器（PTBR）以指向新进程的页表，确保后续虚实地址转换映射到新进程空间。故 I、II、III 均需执行。\n其他选项：A、B、C 分别遗漏了控制流断点（I）、栈上下文（II）或地址空间页表基址（III）的更新。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q25",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 25"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q25",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 25"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q26",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q26",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。位图法（位示图）为外存中的每个物理盘块固定分配 1 个二进制位（0/1 标记空闲或已占），位图所占外存空间仅由磁盘总盘块数决定（⌈总块数/8⌉ 字节），无论当前有多少块空闲，位图本身的大小恒定不变。\n其他选项：B（空闲表法）的表项数随连续空闲区段数变化；C（成组链接法）和 D（空闲链表法）用于串联记录空闲盘块号的链式结构规模均随当前空闲块数量动态增减。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q26",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 26"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q26",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 26"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q27",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q27",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。伙伴算法（Buddy System）将所有分区大小限制为 2^k：分配时按需对半分裂成两个等大的伙伴块；回收一个大小为 2^k 的空闲块时，仅当其配对的等大伙伴块（同为 2^k）也空闲时才合并为 2^(k+1) 的块，不会合并大小不等的相邻空闲区。\n其他选项：B（最佳适应）、C（最坏适应）、D（首次适应）均为常规动态分区分配算法，回收内存时只要与前后物理相邻的空闲分区紧挨着，不论二者大小是否相等都会直接合并。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q27",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 27"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q27",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 27"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q28",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q28",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。进程是资源分配的基本单位，同一进程内的所有线程共享进程的地址空间（代码段、数据段、堆等，I 可共享）以及进程级打开文件表（线程 T 打开文件所得描述符 fd 记录在进程 P 的打开文件表中，同进程的 Ta 与 Tb 可直接共享该 fd，III 可共享）。而每个线程作为独立调度单位，各自拥有私有的寄存器上下文和线程栈（II 不作为共享资源）。因此选 B。\n其他选项：A 漏选了进程级共享的文件描述符 III；C、D 误将线程 T 的私有栈 II 视为共享资源。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q28",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 28"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q28",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 28"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q29",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q29",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。open() 以文件路径名/文件名为参数，内核需沿目录树按名查找对应目录项，将目标文件的磁盘索引结点（FCB）读入内存并建立打开文件表项，返回文件描述符 fd。因此 open() 包含文件按名查找功能。\n其他选项：B（read()）、C（write()）、D（close()）均直接使用 open() 返回的整数文件描述符 fd 索引打开文件表定位目标文件，不再传文件名也不执行目录按名查找。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q29",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 29"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q29",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 29"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q30",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q30",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。10 个进程在 0 时刻均已在就绪队列，时间片为 5ms，队尾进程 P 所需 CPU 时间最短（25ms，共需 25÷5=5 个时间片），说明排在 P 前面的 9 个进程各自所需 CPU 时间均不少于 25ms，在前 5 轮中每一个前序进程在轮到自己时都至少还能跑满 1 个 5ms 时间片。前 4 轮每轮 10 个进程各运行 5ms，耗时 4×10×5 = 200ms（P 累计运行 20ms，剩 5ms）；第 5 轮前 9 个进程依次各运行 5ms 耗 45ms，随后 P 运行最后 5ms 于 200 + 45 + 5 = 250ms 结束。因到达时刻为 0，P 的周转时间为 250ms。\n其他选项：A（200ms）漏算了第 5 轮；B（205ms）误以为第 5 轮前 9 个进程无须执行（200+5）；D（295ms）多算了一整轮。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q30",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 30"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q30",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 30"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q31",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q31",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。按键盘输入的中断处理流程，用户按键后扫描码先进入键盘控制器的数据寄存器并向 CPU 发出中断请求；CPU 响应中断进入内核态执行键盘中断服务例程，从键盘控制器的数据寄存器读走数据，转换成相应编码后存入内核缓冲区，至此中断服务例程执行结束。此后只有当用户进程发起读系统调用时，内核才会把数据从内核缓冲区复制到用户缓冲区。\n其他选项：A（用户缓冲区）要等目标进程执行读系统调用由内核完成复制后才写入；B（CPU 中的通用寄存器）仅在指令搬运数据时作临时中转，中断返回恢复现场时即还原；D（键盘控制器的数据寄存器）是中断服务例程读取前的硬件暂存处，例程结束时已被读出。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q31",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 31"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q31",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          3,
          4
        ],
        "locator": "PDF page 3, 4; question 31"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q32",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q32",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。循环扫描算法（CSCAN）规定磁头单向移动提供服务，到达磁盘一端边界磁道后立即直接跳转至另一端边界磁道，再沿原方向继续扫描。当前刚完成 200 号磁道且向磁道号减小方向移动：第一段沿减小方向依次访问 160→120→110→0，移动距离为 200 - 0 = 200；到达最小磁道 0 后回跳至最大磁道 399（且 399 恰有请求），移动距离为 399 - 0 = 399；第二段继续沿减小方向依次访问 399→300→210，移动距离为 399 - 210 = 189。总移动距离 = 200 + 399 + 189 = 788。\n其他选项：A（599）按双向扫描算法 SCAN 计算（200→0 移动 200，直接掉头 0→399 移动 399，共 599）；B（619）混淆了初始扫描方向或回跳端点；D（799）误将最后一段算到 200 号（200 + 399 + 200 = 799），未在最后一个请求 210 号处停止。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q32",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 32"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q32",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 32"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q33",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q33",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。分组交换网络中，端到端吞吐量受路径上带宽最小链路（瓶颈链路）及源、目的主机各自接入链路带宽的共同限制。观察题 33 图，H1 连接左侧路由器的接入链路带宽为 10Mb/s，右侧路由器连接 H2 的接入链路带宽也为 10Mb/s；两台边缘路由器之间有三条通路：上路经中间路由器两段均为 1000Mb/s、中路直连为 1Mb/s、下路经中间路由器两段均为 100Mb/s。路由选择上路或下路转发时，端到端路径瓶颈均落在两端 10Mb/s 接入链路上，即便多路径分流也无法突破主机单条 10Mb/s 接入线速，故最大吞吐量约为 10Mb/s。\n其他选项：A（1Mb/s）误把中间 1Mb/s 低速支路当作必经链路；C（100Mb/s）和 D（1000Mb/s）只看核心网转发链路带宽，忽略了 H1、H2 接入链路的 10Mb/s 瓶颈。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q33",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 33"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q33",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 33"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q34",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q34",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。二进制频移键控（FSK/2FSK）用两个不同频率的载波分别对应二进制基带信号“0”和“1”，发送时保持振幅不变而在两个载波频率之间切换，因此需要 2 个不同频率的载波。\n其他选项：A（ASK，幅移键控）使用单一频率载波，靠改变载波振幅传递 0 和 1；B（PSK，绝对相移键控）和 D（DPSK，相对相移键控）均使用单一频率载波，分别通过载波的绝对相位或相邻码元的相位差传递 0 和 1。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q34",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 34"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q34",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 34"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q35",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q35",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。按端口划分的 VLAN 在数据链路层隔离广播域，没有路由器或三层交换转发时，ARP 广播请求只能在所属 VLAN 的端口范围内泛洪，主机 ARP 表不会学到其他 VLAN 主机的映射。对照题 35 图：VLAN1 包含端口 1～5、13～17，连接 H2（端口 1，192.168.3.81，00-18-A2-3B-36-21）、H3（端口 2，192.168.3.125，00-E5-78-4A-09-B2）、H4（端口 5，192.168.3.12）和 H1（端口 13，192.168.3.91）；VLAN2 包含端口 6～8、18～20（连接 H5）；VLAN3 包含端口 9～12、21～24，其中端口 9 连接 H6（192.168.3.129，00-08-6E-05-A7-82）。H4 属于 VLAN1，而 D 项对应 VLAN3 中的 H6，因广播域隔离，不会出现在 H4 的 ARP 表中。\n其他选项：A（H2）、B（H1）、C（H3）均与 H4 同处 VLAN1 且 IP、MAC 与图中完全一致，同网段二层通信后均可缓存在 H4 的 ARP 表中。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q35",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 35"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q35",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 35"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q36",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q36",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。注：来源重构卷将题干“DIFS=128μs，SIFS=28μs”误排为“DIFS=128s，SIFS≥28μs”，按原卷标准参数 DIFS=128μs、SIFS=28μs 计算。数据帧长 1998B = 15984bit，在 54Mb/s 信道上的传输时延 T_DATA = 15984 ÷ 54 = 296μs。AP 发送的 CTS 帧中携带的持续时间（即隐藏站 B 收到 CTS 帧完备时设置的 NAV 值），等于 CTS 帧结束后直至本次数据帧及其确认帧 ACK 全部传输完毕所需的信道占用时间：NAV = SIFS + T_DATA + SIFS + T_ACK = 28 + 296 + 28 + 2 = 354μs。\n其他选项：A（326μs = 296 + 28 + 2）漏加了 CTS 结束到数据帧开始之间的第 1 个 SIFS（28μs）；C（385μs = 3 + 28 + 354）多加了此前已传完的 RTS（3μs）和一个 SIFS（28μs）；D（513μs = 128 + 385）在 C 的基础上又误把争用前的 DIFS（128μs）计入 NAV。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q36",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 36"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q36",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 36"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "来源重构卷 2024.pdf（paper-4.jpg）及当前 2024.json 题干存在排版错印：把“DIFS=128μs，SIFS=28μs”印成了“DIFS=128s，SIFS≥28μs”（CTS 的 2μs 亦印作 2us）；由选项差值 354-326=28、513-385=128 可严格反推原卷数值为 DIFS=128μs、SIFS=28μs，建议记入题干勘误。"
    ]
  },
  {
    "id": "supplement:cn408-2024-q37",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q37",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。选择重传（SR）协议采用 3 比特序号（0～7），发送窗口与接收窗口大小相同且取最大值时，窗口尺寸 W = 2^(3-1) = 4。对照题 37 图：初始发送窗口为 [0, 1, 2, 3]，甲连续发送 F0、F1（途中丢失）、F2、F3 后发送窗口已满；随后甲收到乙对 F0 的独立确认 ACK0，发送窗口向前滑动 1 格变为 [1, 2, 3, 4]，新序号 4 进入发送窗口，故甲在 ACK0 到达后的 t1 时刻发送 F4；接着甲收到 ACK2（因窗口下沿 F1 仍未确认，窗口停留在 [1, 2, 3, 4]）；到 t2 时刻图中标明“F1 超时”，SR 协议只重传超时的帧，因此甲在 t2 时刻重传 F1。\n其他选项：A（F1, F3）和 B（F1, F4）误认为收到 ACK0 的 t1 时刻就会重传 F1（此时 F1 计时器尚未超时）；C（F3, F1）看错了滑动前已发送的帧范围（F3 早已发出，滑入窗口的新帧是 F4）。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q37",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 37"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q37",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          4,
          5
        ],
        "locator": "PDF page 4, 5; question 37"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q38",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q38",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。总最少时间由“建立连接 + 数据传输 + 释放连接握手 + TIME_WAIT 等待”四部分组成：（1）TCP 三次握手建立连接：H 发 SYN 到收到 SYN+ACK 需 1 个 RTT（10ms），第 3 次握手发 ACK；（2）慢开始发送 3000B（共 3 个 MSS）：初始拥塞窗口 cwnd = 1 MSS（1000B），第 1 轮发 1000B 并收到确认需 1 个 RTT（10ms），cwnd 增至 2 MSS，第 2 轮发剩余 2000B 并收到确认再需 1 个 RTT（10ms），数据阶段共 2 个 RTT（20ms）；（3）H 主动关闭连接：在服务器无后续数据发送的最快情形下，H 发 FIN 到收到服务器的 FIN+ACK（或紧邻的 ACK 与 FIN）需 1 个 RTT（10ms）；（4）H 发最后一次 ACK 后进入 TIME_WAIT 状态，必须等待 2MSL = 2 × 30s = 60s 才进入 CLOSED 状态。合计至少 4 × 10ms + 60s = 60.04s。\n其他选项：A（30.03s）和 B（30.04s）将 TIME_WAIT 等待时间 2MSL 误算成了 1 个 MSL（30s）；C（60.03s）忽略了慢开始初始 cwnd = 1 MSS 的限制，误以为 3000B 可在 1 个 RTT 内一次发完（少算 1 个 RTT = 0.01s）。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q38",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 38"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q38",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          5
        ],
        "locator": "PDF page 5; question 38"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q39",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q39",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。UDP 校验和采用 16 位二进制反码求和运算（最高位产生进位须回卷加到最低位，全部加完后将结果按位取反）：先做 16 位无符号二进制加法 1011 1001 1011 0110 + 0110 0101 1100 0101 = 1 0001 1111 0111 1011；最高位产生进位 1，将其回卷加到最低位得 0001 1111 0111 1011 + 1 = 0001 1111 0111 1100；最后将反码和按位取反，得到最终校验和 1110 0000 1000 0011。\n其他选项：A（0001 1111 0111 1011）既丢弃了最高位回卷进位，又未按位取反；B（0001 1111 0111 1100）完成了回卷相加，但漏掉了最后一步按位取反；D（1110 0000 1000 0100）未将最高位进位回卷就直接对低 16 位取反。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q39",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 39"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q39",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          5
        ],
        "locator": "PDF page 5; question 39"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2024-q40",
    "version": "2026.11.25.1",
    "questionId": "cn408-2024-q40",
    "questionContentVersion": "2024.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。该 Web 页本身（基本 HTML 文件）加上引用的 7 个小图像文件，共需传输 1 + 7 = 8 个对象。非持久 HTTP/1.0 每请求 1 个对象都必须单独建立一条 TCP 连接，且浏览器不支持并行 TCP 连接，因此 8 个对象只能串行逐个传输。每个对象先经 TCP 三次握手的前两步（SYN 与 SYN+ACK）耗费 1 个 RTT，第三步握手 ACK 可捎带（或紧随发出）HTTP 请求，服务器发回响应再耗费 1 个 RTT，故每个对象至少需要 2 个 RTT；串行传输 8 个对象至少需要 8 × 2 = 16 个 RTT。\n其他选项：A（4）误按支持并行连接计算（先取 HTML 用 2 RTT，再并行取 7 张图用 2 RTT）；B（9）误按非流水线持久连接 HTTP/1.1 计算（建连 1 RTT + 8 个对象各 1 RTT）；C（14）只算了 7 个图像的 7 × 2 = 14 个 RTT，漏算了获取基本 HTML 页本身的 2 个 RTT。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2024-q40",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "83146d04e95bdf2e7a58b6157a2ba00029c7b4268f1937bedd740ae7f1868523",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 40"
      },
      {
        "role": "question",
        "questionId": "cn408-2024-q40",
        "questionContentVersion": "2024.0-draft.2",
        "documentSha256": "baae7ba96588d55117a31c297304927d3791d0f3576bf0c70f32fd8a9fe1766c",
        "pages": [
          5,
          6
        ],
        "locator": "PDF page 5, 6; question 40"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  }
];
export default questionSupplementDrafts2024;
