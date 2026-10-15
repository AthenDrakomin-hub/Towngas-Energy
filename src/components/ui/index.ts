/**
 * UI 组件统一导出入口
 * 按类别分组，方便按需导入
 */

// ---- 表单类 ----
export { Button } from "./form/Button";
export { Input } from "./form/Input";
export { NumberInput } from "./form/NumberInput";

// ---- 展示类 ----
export { Card } from "./display/Card";
export { Badge } from "./display/Badge";
export { DataTable } from "./display/DataTable";
export type { DataTableColumn } from "./display/DataTable";

// ---- 表单类 ----
export { Dropdown } from "./form/Dropdown";
export type { DropdownItem } from "./form/Dropdown";

// ---- 反馈类 ----
export { Modal } from "./feedback/Modal";
export { ToastProvider, useToast } from "./feedback/Toast";
export { ConfirmDialog } from "./feedback/ConfirmDialog";
export { Skeleton, SkeletonCard, SkeletonTable } from "./feedback/Skeleton";

// ---- 布局类 ----
export { BottomNav, ClientTopbar } from "./layout/ClientNav";
export { Topbar } from "./layout/Topbar";
export { Sidebar } from "./layout/Sidebar";
export { PageHeader } from "./layout/PageHeader";
export { Panel, Metric, Bar, Chip } from "./Panel";

// ---- 企业级组件（完整库） ----
export {
  StatCard,
  Progress,
  Timeline,
  Steps,
  Tabs,
  Table,
  Pagination,
  Avatar,
  Tag,
  Alert,
  Empty,
  Divider,
  Breadcrumb,
  ColorCard,
} from "./enterprise";
