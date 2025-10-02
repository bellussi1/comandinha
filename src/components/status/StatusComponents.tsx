import { Badge } from "@/src/components/ui/badge";
import { CheckCircle, Coffee, Send, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface StatusIconProps {
  status: string;
  className?: string;
}

/**
 * Badge estilizado para status de pedidos
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status.toLowerCase()) {
    case "pendente":
      return <Badge className={`bg-blue-500 text-white ${className || ""}`}>Pendente</Badge>;
    case "em preparo":
      return <Badge className={`bg-orange-500 text-white ${className || ""}`}>Em preparo</Badge>;
    case "entregue":
      return <Badge className={`bg-green-500 text-white ${className || ""}`}>Entregue</Badge>;
    case "concluido":
      return <Badge className={`bg-slate-500 text-white ${className || ""}`}>Concluído</Badge>;
    default:
      return <Badge className={className}>{status}</Badge>;
  }
}

/**
 * Ícone para status de pedidos
 */
export function StatusIcon({ status, className = "h-5 w-5" }: StatusIconProps) {
  const iconClass = className;

  switch (status.toLowerCase()) {
    case "pendente":
      return <Clock className={`${iconClass} text-blue-500`} />;
    case "em preparo":
      return <Coffee className={`${iconClass} text-orange-500`} />;
    case "entregue":
      return <Send className={`${iconClass} text-green-500`} />;
    case "concluido":
      return <CheckCircle className={`${iconClass} text-slate-500`} />;
    default:
      return <CheckCircle className={iconClass} />;
  }
}

/**
 * Utilitário para obter a cor do status
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "pendente":
      return "text-blue-500";
    case "em preparo":
      return "text-orange-500";
    case "entregue":
      return "text-green-500";
    case "concluido":
      return "text-slate-500";
    default:
      return "text-gray-500";
  }
}