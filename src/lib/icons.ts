/**
 * Centralized icon imports from lucide-react
 * Import only what you need to reduce bundle size
 * Instead of: import { Icon } from "lucide-react"
 * Use: import { Icon } from "@/src/lib/icons"
 */

// Re-export only the icons actually used in the app
export {
  // Admin
  Package,
  Tags,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Power,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  CheckCircle,
  XCircle,
  Bell,

  // Menu & Cart
  ShoppingCart,
  ChevronRight,
  Filter,
  Hand,
  Receipt,
  QrCode,
  Minus,
  Clock,
  Star,
  X,
  Check,

  // Status & Loading
  Loader2,
  AlertCircle,
  Coffee,
  RefreshCw,
  Search,
  Send,
  ArrowLeft,

  // Fechamento
  Calculator,
  DollarSign,
  Users as UsersIcon,
  AlertTriangle,
  FileText,
} from 'lucide-react';

// Type exports for convenience
export type { LucideProps, LucideIcon } from 'lucide-react';
