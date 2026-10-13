import { CheckCircle, Coffee, Send, Clock } from "lucide-react";

interface StatusIconProps {
  status: string;
}

export const StatusIcon = ({ status }: StatusIconProps) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'pendente':
      return <Clock className="h-5 w-5 text-blue-500" />;
    case 'em preparo':
      return <Coffee className="h-5 w-5 text-orange-500" />;
    case 'entregue':
      return <Send className="h-5 w-5 text-green-500" />;
    case 'concluido':
      return <CheckCircle className="h-5 w-5 text-slate-500" />;
    default:
      return <CheckCircle className="h-5 w-5 text-gray-400" />;
  }
}; 