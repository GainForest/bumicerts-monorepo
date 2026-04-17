import { Loader2Icon } from "lucide-react";

const AuthCompleteLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <Loader2Icon className="size-6 text-primary animate-spin" />
    </div>
  );
};

export default AuthCompleteLoader;
