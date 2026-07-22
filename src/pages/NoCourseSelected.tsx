import { useNavigate } from "react-router-dom";
import { GraduationCap, AlertCircle } from "lucide-react";

const NoCourseSelected = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground">Curso não selecionado</p>
          <p className="text-sm text-muted-foreground">
            Você precisa selecionar um curso para acessar esta página.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <AlertCircle className="w-4 h-4" />
          Selecionar um curso
        </button>
      </div>
    </div>
  );
};

export default NoCourseSelected;
