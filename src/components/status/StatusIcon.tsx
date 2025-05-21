import { CheckCircle, Coffee, Send, Clock } from "lucide-react";
import { STATUS } from "@/src/constants";

interface StatusIconProps {
  status: string;
}

export const StatusIcon = ({ status }: StatusIconProps) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case STATUS.CONFIRMADO:
      return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case STATUS.PREPARANDO:
      return <Coffee className="h-5 w-5 text-orange-500" />;
    case STATUS.PRONTO:
      return <Send className="h-5 w-5 text-green-500" />;
    case STATUS.ENTREGUE:
      return <Clock className="h-5 w-5 text-slate-500" />;
    default:
      return <CheckCircle className="h-5 w-5" />;
  }
}; 