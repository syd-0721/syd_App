import { DailyOverbudgetNote, ExpenseRecord, MonthlyBudget } from '../types/ledger';

export const INITIAL_BUDGETS: Record<string, MonthlyBudget> = {
  '2026-11': {
    monthKey: '2026-11',
    disposable: 2400, // 每周可支配 = 600，每日平均可支配 = 80
    floating: 800,
    savings: 1800, // 总金额 = 5000
  },
  '2026-10': {
    monthKey: '2026-10',
    disposable: 2400,
    floating: 800,
    savings: 1800,
  },
};

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  // 2026-11 本月记账数据 (第一周累计 ¥638 > ¥600 周度额度，触发常驻超支警告)
  {
    id: 'exp-nov-01-1',
    date: '2026-11-01',
    amount: 42,
    category: '餐饮',
    title: '早午餐咖啡',
    createdAt: 1762000100000,
  },
  {
    id: 'exp-nov-01-2',
    date: '2026-11-01',
    amount: 26,
    category: '餐饮',
    title: '买菜与水果',
    createdAt: 1762000200000,
  },
  {
    id: 'exp-nov-02-1',
    date: '2026-11-02',
    amount: 168,
    category: '购物',
    title: '羊毛袜拖鞋',
    createdAt: 1762080100000,
  },
  {
    id: 'exp-nov-02-2',
    date: '2026-11-02',
    amount: 52,
    category: '餐饮',
    title: '商务简餐',
    createdAt: 1762080200000,
  },
  {
    id: 'exp-nov-03-1',
    date: '2026-11-03',
    amount: 35,
    category: '餐饮',
    title: '牛肉面午餐',
    createdAt: 1762160100000,
  },
  {
    id: 'exp-nov-03-2',
    date: '2026-11-03',
    amount: 38,
    category: '充值缴费',
    title: '手机流量包',
    createdAt: 1762160200000,
  },
  {
    id: 'exp-nov-04-1',
    date: '2026-11-04',
    amount: 59,
    category: '餐饮',
    title: '豚骨拉面',
    createdAt: 1762240100000,
  },
  {
    id: 'exp-nov-05-1',
    date: '2026-11-05',
    amount: 86,
    category: '餐饮',
    title: '烤鱼聚餐',
    createdAt: 1762320100000,
  },
  {
    id: 'exp-nov-05-2',
    date: '2026-11-05',
    amount: 132,
    category: '休闲娱乐',
    title: '电影与桌游',
    createdAt: 1762320200000,
  },

  // 2026-10 上月对比数据 (用于计算环比 MoM，如餐饮上月 ¥250 vs 本月 ¥300 -> +20%)
  {
    id: 'exp-oct-01',
    date: '2026-10-02',
    amount: 250,
    category: '餐饮',
    title: '10月日常三餐',
    createdAt: 1759400000000,
  },
  {
    id: 'exp-oct-02',
    date: '2026-10-03',
    amount: 120,
    category: '购物',
    title: '10月日用采购',
    createdAt: 1759480000000,
  },
  {
    id: 'exp-oct-03',
    date: '2026-10-04',
    amount: 50,
    category: '充值缴费',
    title: '10月话费充值',
    createdAt: 1759560000000,
  },
  {
    id: 'exp-oct-04',
    date: '2026-10-05',
    amount: 95,
    category: '休闲娱乐',
    title: '10月球馆场地',
    createdAt: 1759640000000,
  },
  {
    id: 'exp-oct-05',
    date: '2026-10-06',
    amount: 40,
    category: '其他支出',
    title: '快递与打印',
    createdAt: 1759720000000,
  },
];

export const INITIAL_OVERBUDGET_NOTES: Record<string, DailyOverbudgetNote> = {
  '2026-11-02': {
    date: '2026-11-02',
    explanation: '换季采购羊毛袜与保暖拖鞋',
    updatedAt: 1762085000000,
  },
  '2026-11-05': {
    date: '2026-11-05',
    explanation: '同事聚餐烤鱼并预订电影票',
    updatedAt: 1762325000000,
  },
};
