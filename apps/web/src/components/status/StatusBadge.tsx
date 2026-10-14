import { Badge } from "@/src/components/ui/badge";
import { STATUS_COLORS_BY_STRING } from "@/src/constants";
import { getDisplayText } from "@/src/services/fechamento";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusLower = status.toLowerCase();
  
  // Usar mapeamento direto por string para melhor flexibilidade
  const statusClass = STATUS_COLORS_BY_STRING[statusLower];

  if (statusClass) {
    const displayText = getDisplayText(status);
    return <Badge className={statusClass}>{displayText}</Badge>;
  }

  return <Badge variant="outline">{getDisplayText(status)}</Badge>;
}; 