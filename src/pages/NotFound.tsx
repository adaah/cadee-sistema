import { useNavigate } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Página não encontrada</p>
          <p className="text-sm text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Home className="w-4 h-4" />
          Voltar para a página inicial
        </button>
      </div>
    </div>
  );
};

export default NotFound;
