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
    case "confirmado":
      return <Badge className={`bg-blue-500 ${className || ""}`}>Confirmado</Badge>;
    case "preparando":
      return <Badge className={`bg-orange-500 ${className || ""}`}>Em preparo</Badge>;
    case "pronto":
      return <Badge className={`bg-green-500 ${className || ""}`}>Pronto</Badge>;
    case "entregue":
      return <Badge className={`bg-slate-500 ${className || ""}`}>Entregue</Badge>;
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
    case "confirmado":
      return <CheckCircle className={`${iconClass} text-blue-500`} />;
    case "preparando":
      return <Coffee className={`${iconClass} text-orange-500`} />;
    case "pronto":
      return <Send className={`${iconClass} text-green-500`} />;
    case "entregue":
      return <Clock className={`${iconClass} text-slate-500`} />;
    default:
      return <CheckCircle className={iconClass} />;
  }
}

/**
 * Utilitário para obter a cor do status
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "confirmado":
      return "text-blue-500";
    case "preparando":
      return "text-orange-500";
    case "pronto":
      return "text-green-500";
    case "entregue":
      return "text-slate-500";
    default:
      return "text-gray-500";
  }
}