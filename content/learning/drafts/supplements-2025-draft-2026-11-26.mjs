// 2025 年单选题补充解析草稿，供独立复核。
export const questionSupplementDrafts2025 = [
  {
    "id": "supplement:cn408-2025-q01",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q01",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。令 m=⌊√n⌋。外层的 i 从 1 取到 m，第 i 轮恰好执行 i 次 count++，合计 m(m+1)/2 次，增长阶为 Θ(n)。\n其他选项：A 的对数阶低估了累加次数。C 多计了一个对数因子。D 把两层都当成了 n 次循环。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q01",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 1"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q01",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q02",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q02",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。扫描到左括号就入栈，遇到匹配的右括号就出栈。D 读到 d 前面的左圆括号时，栈中需要同时容纳 [、(、[、(，第 4 次入栈超过容量。\n其他选项：A 最深是 (、[、(。B 的 (b+c) 与 (d−e) 先后闭合，最深是 [、(、(。C 的 (c−d) 与 (f+g) 也先后闭合，最深同为 3。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q02",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 2"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q02",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q03",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q03",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。从下标 0 起，非根位置 i 的双亲下标为 ⌊(i−1)/2⌋。D 中 19 在下标 8，双亲位置 3 却是空位 −1，19 无法连到根。\n其他选项：A 中 35 是 40 的左孩子。B 中 18 和 35 是 40 的两个孩子。C 中 12 是 10 的右孩子。这三组的每个非根实结点都有实双亲。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q03",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 3"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q03",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q04",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q04",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。用左孩子右兄弟表示法，将每个结点的第一个孩子接到左指针，将下一个兄弟接到右指针。森林各棵树的根也按兄弟相连，以第一棵树的根为二叉树的根。\n其他选项：A 中只有根和左孩子的树就是完全二叉树，根的度为 1。C 中一条有三个结点的单支链有两个分支结点、一个叶结点。D 中根运算符要等两个操作数的值就绪，通常最后计算。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q04",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 4"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q04",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q05",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q05",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。反复合并最小的两个权值，依次得到 2+3=5、4+5=9、6+8=14、9+10=19、11+14=25、19+25=44。每参与一层合并，码长加 1。按题给顺序，码长为 4、4、3、3、3、2、2，前五个都达到 3。\n其他选项：A 的 2 只数到了码长为 4 的字符。B 的 3 只数到了码长恰为 3 的字符。C 的 4 少算了五个合格字符中的一个。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q05",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 5"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q05",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q06",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q06",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。在有限无向图中取一条最长简单路径。端点的邻居全在路径上，否则还能延长。端点度至少为 2，除相邻的前驱外还连着路径上另一顶点，这条边和中间的路径就构成回路。\n其他选项：A 的反例是一个有向环，每个顶点入度都是 1。B 中两个互不依赖的顶点可以交换次序，拓扑序可能有多个。D 中 BFS 按经过的边数分层，权重不等时，边数最少的路径可能更贵。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q06",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 6"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q06",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q07",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q07",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。设每块 s 个元素，共 400/s 块。成功查找时，顺序定位块平均比较 (400/s+1)/2 次，块内平均比较 (s+1)/2 次。两项之和在 400/s=s 时最小，故取 s=20，平均 21 次。\n其他选项：A 取 8 时平均 30 次，B 取 10 时平均 26 次，D 取 25 时平均 21.5 次，均高于 21 次。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q07",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 7"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q07",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 7"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q08",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q08",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。4 阶 B 树每个非根结点有 1～3 个关键字。将存关键字的结点按层计，两层时根含 1、2、3 个关键字，孩子的关键字数分别只能为 (3,3)、(1,1,3) 或 (1,2,2) 的各三种排列、(1,1,1,1)，共 1+6+1=8 种。三层至少要 1+2+4=7 个关键字，恰好只有每个结点各含一个的形状。中序次序固定了每种形状的关键字排列，共 9 种。\n其他选项：A 的 7 少计了两种合法结构。B 的 8 只数了两层。D 的 10 多计了一种，单层装不下 7 个关键字，四层的最少关键字数已达 15。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q08",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 8"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q08",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 8"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q09",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q09",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。线性探查从散列地址起依次访问下一槽，到表尾后回到表头。至多走一整圈就遍历全表，只要有空槽就能找到。\n其他选项：B 中平方增量取模可能重复而漏过空槽。C 中某槽可能已被从别处线性探查来的关键字占用，二者的初始散列地址可以不同。D 中两个同义词的初始散列地址相同，首次探查就会冲突。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q09",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 9"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q09",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          1
        ],
        "locator": "PDF page 1; question 9"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q10",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q10",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。简单选择排序每趟先找出未排序区的最小元素，再把它与区首交换，n 个元素至多交换 n−1 次，最坏移动次数为线性阶。扫描时比较关键字无需挪动元素。\n其他选项：A 中逆序输入会引起二次阶的相邻交换。B 中逆序输入使每个新元素插到前面，累计后移次数同样是二次阶。C 的常规快速排序在反复产生严重不均衡划分时，元素移动次数也可能超过线性阶。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q10",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 10"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q10",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          1,
          2
        ],
        "locator": "PDF page 1, 2; question 10"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q11",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q11",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。按表中初始序列，每隔 3 个位置取一组。(5,30,45) 已有序，(25,10,15) 排成 (10,15,25)，(40,20,35) 排成 (20,35,40)。放回原位置恰得第一趟。再按间隔 2 排各组，得到 5,10,15,25,20,30,40,35,45，与第二趟相同。这是逐步缩小增量的希尔排序。\n其他选项：B 的十进制基数排序首趟按一位数字分桶，表中个位 0 和 5 仍然交错。C 的二路归并首趟会使相邻的组内有序，表中第 7、8 位却是 45、25。D 的折半插入首趟只会整理前两个元素，其余位置不会成批改变。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q11",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 11"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q11",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q12",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q12",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。把 −32767 赋给 32 位 unsigned int，结果按模 2³² 取值。因 32767=2¹⁵−1，故 ui=2³²−32767=2³²−2¹⁵+1，即 FFFF8001H。\n其他选项：A 的 2¹⁵−1 是原值的绝对值。B 的 2¹⁵+1 是把 16 位位型 8001H 直接当作无符号数。C 的 2³²−2¹⁵−1 比正确结果小 2。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q12",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 12"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q12",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 12"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "选项排版：paper-2.jpg 的 2¹⁵、2³² 在题包选项中展平为 215、232。正文按扫描页还原指数，答案无分歧。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q13",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q13",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。47300000H 按符号、阶码和尾数拆开，符号位为 0，阶码为 10001110₂=142，实际指数是 142−127=15。尾数字段开头为 011，其余为 0，小数部分是 1/4+1/8=0.375。规格化数还有隐含的整数位 1，故 x=1.375×2¹⁵=45056。\n其他选项：A 同时漏掉隐含的 1 并将指数算成 14。B 的有效数正确，指数少 1。C 的指数正确，却只使用了小数部分。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q13",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 13"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q13",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 13"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "选项排版：paper-2.jpg 的 2¹⁴、2¹⁵ 在题包选项中展平为 214、215。正文按扫描页还原指数，答案无分歧。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q14",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q14",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。A3H 的最高位为 1，按 8 位补码解读为 163−256=−93。75H 表示 117，数学差为 −210，越过下限 −128，故 OF=1。运算器只保留低 8 位，−210+256=46，即 2EH。\n其他选项：A 的结果 24 和 OF=0 都与计算不符。B 判对了溢出，但低 8 位是 2EH，即十进制 46。C 算对低 8 位，却漏判有符号溢出。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q14",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 14"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q14",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q15",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q15",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。id 占偏移 0～3，name 占 4～13，补齐 2 字节后 salary 占 16～19，每个结构体共 20 字节（14H）。employee[1].id 从 A0B0H+14H=A0C4H 起，小端存放时依次为 78H、56H、34H、12H，56H 在 0000 A0C5H。\n其他选项：A 的 A0C3H 还在前一个结构体内。B 的 A0C4H 存 78H。D 的 A0C6H 存 34H。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q15",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 15"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q15",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q16",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q16",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。指令集体系结构规定程序与处理器之间的接口。指令字是否定长直接决定指令流如何编码、译码，编译器和汇编器生成的机器码必须与之相符。\n其他选项：A 的阵列乘法器是执行乘法的一种电路。C 的微程序控制器是生成控制信号的一种实现。D 的单总线数据通路是处理器内部连接部件的一种方式。同一套 ISA 可以有不同的这些实现。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q16",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 16"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q16",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q17",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q17",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。本题选错误叙述。RISC 常见的规整指令格式、简单寻址和 Load/Store 分工，便于把取指、译码、执行等操作划为流水段，C 所说的实现困难不成立。\n其他选项：A 符合简单指令常用硬连线控制的做法。B 中只有专门的访存指令直接读写内存，是典型 RISC 风格。D 中把若干参数经寄存器传给被调用过程，是常见的调用约定。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q17",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 17"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q17",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q18",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q18",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。本题选错误叙述。程序的平均 CPI 是总时钟周期数除以执行的指令数。Cache 缺失可能令处理器停顿，增加总周期数；在其他条件相同时，缺失率会影响平均 CPI。\n其他选项：A 中不同指令的执行步骤和延迟可能不同。C 中单周期设计要让最慢指令也能在一个周期内完成。D 中各流水段共用时钟，周期必须容纳最慢段的延迟，实际设计还要计入流水寄存器开销。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q18",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 18"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q18",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 18"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q19",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q19",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。本题选错误叙述。程序计数器 PC 属于专用状态，取指时提供地址，随后由顺序执行或控制转移逻辑更新。通用寄存器组没有必须包含 PC 的要求。\n其他选项：B 中控制器须识别指令操作码才能生成相应控制信号。C 中典型单周期 CPU 仅需给出本条指令的一组控制信号，多周期 CPU 还要跟踪当前执行步骤。D 中流水线存在指令重叠，需要处理数据相关和分支造成的冒险。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q19",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 19"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q19",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          2
        ],
        "locator": "PDF page 2; question 19"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q20",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q20",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。题干括号明确给出每秒 1333M 次传送，这一传送率已计入每时钟周期 4 次。总线一次传 64 位，即 8 字节。带宽为 1333×10⁶×8 B/s=10.664 GB/s，约 10.66 GB/s。\n其他选项：B 的 42.66 GB/s 将每周期 4 次重复计入。C 的 85.31 是以 Gb/s 表示的数值，写成 GB/s 大了 8 倍。D 同时重复乘 4、漏掉位到字节的换算。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q20",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 20"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q20",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          2,
          3
        ],
        "locator": "PDF page 2, 3; question 20"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "单位表述：paper-2.jpg 将 1333 写成 MHz，同时在括号中明确实际单位 MT/s。按明确给出的传送率得 A。若真给的是物理时钟频率，才应再乘 4 得 B。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q21",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q21",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。网卡（Ⅱ）常按帧或缓冲区收发数据，固态硬盘（Ⅲ）按块读写数据。两者适合由 CPU 设置传输任务，再由 DMA 在设备与内存之间成批搬运数据，减少 CPU 逐字节参与的开销。\n其他选项：A 含按键事件零散、数据量小的键盘（Ⅰ），还漏了硬盘。C 含低速针式打印机（Ⅳ），漏了硬盘。D 也含打印机，漏了网卡。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q21",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 21"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q21",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q22",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q22",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。DMA 控制器在完成一批数据传送后，可以向 CPU 发出外部中断请求，通知驱动程序处理完成事件。请求来源是处理器外的设备控制逻辑。\n其他选项：B 的一次总线事务结束通常由总线协议应答。C 的页故障属于指令执行过程中发现的同步异常，异常处理结束本身不产生外部中断。D 的断点指令由正在执行的程序主动触发陷阱。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q22",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 22"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q22",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q23",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q23",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。内核中断向量表供同一处理器上的各进程共用。切换当前进程时，处理器仍通过同一张表进入内核处理程序，因此表的基址可以保留。\n其他选项：A 的通用寄存器要恢复为新进程的现场。B 的页表基址随独立进程地址空间切换而更新。C 的程序计数器要恢复到新进程继续执行的位置。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q23",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 23"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q23",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q24",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q24",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。本题选错误叙述。VMM 管理虚拟处理器和物理资源，并能截获客体操作系统的敏感操作。即使客体内核看到自己处于最高特权环，宿主仍可借助处理器的虚拟化模式限制它，不能笼统地说二者具有相同的实际控制权限。\n其他选项：A 中客体操作系统可以运行在虚拟硬件上。B 中 VMM 可以为多台虚拟机分配、隔离资源。D 中通过指令解释或二进制翻译可以模拟不同的 ISA。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q24",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 24"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q24",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q25",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q25",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。就绪队列按优先权从高到低排列。新进程到来时，需要沿单链表比较优先权以找到插入位置，最坏扫描 n 个结点，插入为 O(n)。要调度的最高优先权进程就在表头，选取为 O(1)。\n其他选项：A 把查找插入位置也算成了常数时间。B 既低估插入，又忽略可直接选表头。D 对插入的判断正确，但取队首无需遍历。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q25",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 25"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q25",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q26",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q26",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。最初的 0、1、2 三页已在内存，先访问 0、1、2、0 都命中。此后六次缺页的“调入→淘汰”依次为 5→1、1→2、4→0、3→5、0→1、2→4。此时页框中为 3、0、2，余下的 3、2、0 都命中，共执行 6 次缺页处理。\n其他选项：A 的 5 漏了一次连续缺页；第 10 次访问的页 2 已在第 6 次访问时淘汰。C 的 7 多算一次，连续缺页后的三个访问均命中。D 的 8 也多算，开头访问已驻留页时不应计入缺页。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q26",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 26"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q26",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q27",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q27",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 D。要让一条指令在缺页重启后能够完成，至少要能同时容纳它执行时必须驻留的页面。间接寻址可能还要访问保存有效地址的页，指令或操作数跨页也会增加需求，因此需要考虑指令系统支持的寻址方式。\n其他选项：A 的代码段可以分批调入，长度不等于单条指令的驻留需求。B 的虚拟地址空间决定可用地址范围。C 的物理内存大小限制可供分配的总量。后两者都不能据此推出单条指令所需的页框下限。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q27",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 27"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q27",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q28",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q28",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。VFS 提供统一的文件操作接口。以打开文件为例，内核根据路径找到对应的挂载点和具体文件系统，再调用该文件系统的实现。调用者可以用同一接口访问不同文件系统。\n其他选项：A 把统一接口层与以内存为存储介质的文件系统混淆。B 中提供统一接口本身不能保证文件访问提速。D 中网络文件系统也可以接入 VFS，挂载后通过同一套调用访问。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q28",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 28"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q28",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q29",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q29",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。本题问新建文件时不会执行哪项操作。采用索引结点时，目录项负责把文件名对应到索引结点号。文件 F 的访问权限随其他属性保存在 F 的索引结点中，目录文件无需再写一份 F 的权限。\n其他选项：A 是给新分配的索引结点设置初始属性。B 是在目录项中登记 F 的索引结点号。D 是把这条含文件名和结点号的新目录项加入目录。三者都是建文件所需的操作。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q29",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 29"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q29",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q30",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q30",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。内存映射文件把文件的某段内容映射到进程的一段虚拟地址，故 Ⅲ 正确。多个进程以共享方式映射同一段文件时，可以通过读写共享内容通信，故 Ⅰ 正确。Ⅱ 混淆了两层映射：这里建立的是虚拟地址范围与文件偏移的对应，底层文件系统另行定位磁盘块。\n其他选项：B 包含 Ⅳ，进程取得的是虚拟地址，物理页框由内核管理。C 包含 Ⅱ 且漏选了共享映射可实现的 Ⅰ。D 包含正确的 Ⅰ、Ⅲ，但多选了 Ⅱ。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q30",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 30"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q30",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q31",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q31",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。FAT 按簇设置表项。表项可用特定值标记空闲，也可指向已分配文件的下一簇或标记链尾，因此扫描 FAT 就能识别哪些簇仍可分配。\n其他选项：A 的目录用于按文件名查找文件。B 的系统打开文件表跟踪当前打开的文件。D 的 FCB 描述单个文件的属性及分配信息。三者都缺少 FAT 这种覆盖全卷分配单元的空闲标记。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q31",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 31"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q31",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          3
        ],
        "locator": "PDF page 3; question 31"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q32",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q32",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。无论底层是机械硬盘还是固态硬盘，文件系统都需要选定逻辑分配单位，即盘块或簇的大小，才能按统一粒度组织文件内容和记录空间分配。\n其他选项：A 的底层扇区由存储设备提供，文件系统在此基础上组织盘块。C 的寻道涉及机械磁头移动，固态硬盘没有这一动作。D 的磨损均衡针对闪存擦写寿命，不是机械硬盘的共同需求。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q32",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 32"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q32",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          3,
          4
        ],
        "locator": "PDF page 3, 4; question 32"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": []
  },
  {
    "id": "supplement:cn408-2025-q33",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q33",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。图中三段链路依次为 10、100、1000 Mb/s，2 MB 文件共 16 000 000 位。电路交换用时 32 μs+1.6 s=1.600032 s。报文交换须将整份报文逐跳收完再发，用时 1.6+0.16+0.016=1.776 s。分组交换有 5000 个 400 B 分组，第一段是瓶颈；最后一个分组离开第一段时已用 1.6 s，还需在后两段各发送 32 μs、3.2 μs，共 1.6000352 s。因此报文最慢，分组次之，电路最快。\n其他选项：A 把电路排在报文之前。C 颠倒了电路与分组，末分组在后两段的 35.2 μs 比建电路的 32 μs 多 3.2 μs。D 把分组排在报文之前，忽略了逐包流水传送。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q33",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 33"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q33",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 33"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "题干排版：paper-4.jpg 给定 1M=10⁶，题包文本将指数展平为 106。验算按扫描页的十进制单位。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q34",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q34",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。按题列顺序给四个码字编号。逐对异或并数 1，(1,2)、(1,3)、(1,4)、(2,3)、(2,4) 的距离都是 4，(3,4) 的距离是 8。最小码距为 4，单独用于检错能保证发现至多 3 位错；单独用于纠错能保证纠正 ⌊(4−1)/2⌋=1 位错。\n其他选项：A 低估了能保证检出的最大位数。B 既低估检错上限，又高估纠错上限。D 的 2 位错可能使收到的字距两个合法码字都为 2，无法唯一纠正。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q34",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 34"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q34",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q35",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q35",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。10 Mb/s 以太网的退避时隙为 512 比特时间，即 51.2 μs。截断二进制指数退避取 k=min(碰撞次数,10)，连续 11 次碰撞后 k 仍为 10，可选时隙数为 0～1023，最大退避为 1023×51.2 μs=52.3776 ms。\n其他选项：A 的 0.512 ms 只等了 10 个时隙。B 的 0.5632 ms 只等了 11 个时隙。D 的 104.8064 ms 按 2¹¹−1 个时隙计算，漏掉指数上限 10。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q35",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 35"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q35",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q36",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q36",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 C。图示为新主机收到 DHCPOFFER 后选择报价、发送 DHCPREQUEST 的阶段。192.168.5.9 只是候选地址，租约尚未确认，主机使用源 IP 0.0.0.0，并向 255.255.255.255 广播选择结果，让本地其他 DHCP 服务器也能收到。按题目先目的、后源的顺序即 C。\n其他选项：A 把服务器地址当成了这一阶段的单播目的地址。B 既采用单播目的地址，又提前使用候选地址作为源。D 的广播目的正确，但源地址也提前用了候选地址。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q36",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 36"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q36",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          4
        ],
        "locator": "PDF page 4; question 36"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "图中字段：paper-4.jpg 把客户端 DHCPREQUEST 的候选地址也标在 yiaddr；初次选择报价时，客户端用 Requested IP Address 选项指明候选地址，yiaddr 为零。该图注不影响 IP 首部的答案。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q37",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q37",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。按本题的端口转换场景，路由器把内网源地址和源端口映射成公网地址和端口，故涉及 Ⅰ。UDP 校验覆盖含 IP 地址的伪首部及 UDP 首部，启用校验时转换后还要调整校验和，故选 Ⅳ。目的服务端口保持原值，UDP 负载长度也未改变。\n其他选项：A 含不会随地址转换而改变的总长度 Ⅲ，漏了校验和。C 选了目的端口 Ⅱ 和总长度 Ⅲ，两项都不符合出站源转换。D 虽含校验和，却把源端口误选成目的端口。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q37",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 37"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q37",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
        "pages": [
          4,
          5
        ],
        "locator": "PDF page 4, 5; question 37"
      }
    ],
    "authorship": "ai-assisted",
    "reviewStatus": "needs-review",
    "doubts": [
      "术语范围：题干统称 NAT，答案 B 按常见的 NAPT 并启用 UDP 校验解释。仅做地址转换时源端口可保留，IPv4 UDP 未启用校验时零校验和也可保留。"
    ]
  },
  {
    "id": "supplement:cn408-2025-q38",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q38",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。图中先发了从 2001、3001 开始的两个 1000 B 段。t₁ 收到 ack_seq=3001，只确认第一段，仍有 1000 B 在途。原拥塞窗口 2000 B 低于慢开始门限 8000 B，一个新确认使它增至 3000 B。与通告窗口 4000 B 取小得发送窗口 3000 B，扣除在途数据后还可发 2000 B，即 2 段。\n其他选项：B 的 3 把整个新拥塞窗口当成了可用余额。C 的 4 直接把接收窗口换算成段数。D 的 5 更超过两个窗口上限，确认段也没有释放这么多空间。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q38",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 38"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q38",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q39",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q39",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 B。按新发起一次 Time 查询、忽略处理与报文发送耗时计算。UDP 可直接发送请求，一去一回共 1 RTT=8 ms。TCP 先建立连接，再获得服务器返回的时间，总计至少 2 RTT=16 ms；收到时间值即可，断开连接无需计入。\n其他选项：A 漏了 TCP 建连的一次往返。C 给 UDP 多加一次往返，同时漏了 TCP 建连。D 给无连接的 UDP 也多算了一次往返。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q39",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 39"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q39",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
    "id": "supplement:cn408-2025-q40",
    "version": "2026.11.26.1",
    "questionId": "cn408-2025-q40",
    "questionContentVersion": "2025.0-draft.2",
    "kind": "supplement",
    "body": [
      {
        "type": "text",
        "text": "答案选 A。POP3 供用户代理连接收件服务器，读取邮箱中的邮件，Ⅰ 正确。同一条 TCP 连接进入事务阶段后，可以先后用 RETR 命令取多封邮件，最后再退出，Ⅳ 正确。\n其他选项：B 的 Ⅱ（用户向服务器投递）和 Ⅲ（服务器之间传递）属于 SMTP 的职责。C 虽含 Ⅰ，却多选 Ⅱ、Ⅲ 并漏选 Ⅳ。D 含正确的 Ⅰ、Ⅳ，但多选了服务器间传递的 Ⅲ。"
      }
    ],
    "sources": [
      {
        "role": "answer",
        "questionId": "cn408-2025-q40",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "06bb902c4f7a5421ed4dd616acd4ca6cc52570ff54f75b9d01bf8f2e6fe6e8a4",
        "pages": [
          1
        ],
        "locator": "answer table (page 1 assumed); answer 40"
      },
      {
        "role": "question",
        "questionId": "cn408-2025-q40",
        "questionContentVersion": "2025.0-draft.2",
        "documentSha256": "28f4fd31bb5ee1a72a839c939b713ef1729271e676d99291df0df26f8ef90b37",
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
  },
];
