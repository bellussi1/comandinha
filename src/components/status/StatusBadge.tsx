import { Badge } from "@/src/components/ui/badge";
import { STATUS, STATUS_COLORS } from "@/src/constants";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case STATUS.CONFIRMADO:
      return <Badge className={STATUS_COLORS.CONFIRMADO}>Confirmado</Badge>;
    case STATUS.PREPARANDO:
      return <Badge className={STATUS_COLORS.PREPARANDO}>Em preparo</Badge>;
    case STATUS.PRONTO:
      return <Badge className={STATUS_COLORS.PRONTO}>Pronto</Badge>;
    case STATUS.ENTREGUE:
      return <Badge className={STATUS_COLORS.ENTREGUE}>Entregue</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}; 