import React, { useState } from 'react';
import { Settings, X, Cpu } from 'lucide-react';
import { SUPPORTED_MODELS } from '../constants/models';

interface SettingsModalProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onClose: () => void;
}

// Componente de modal para configurações, permitindo ao usuário selecionar o modelo de IA a ser utilizado
export const SettingsModal: React.FC<SettingsModalProps> = ({
  selectedModel, setSelectedModel, onClose
}) => {
  const [selectMode, setSelectMode] = useState<string>(selectedModel);

  // Lida com a mudança de seleção do modelo
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectMode(e.target.value);
  };

  // Lida com o salvamento das configurações, atualizando o modelo selecionado e fechando o modal
  const handleSave = () => {
    setSelectedModel(selectMode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl dark:shadow-2xl relative transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-6 text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
          <Settings size={20} />
          Configurações
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="motor-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">
              Motor / Modelo
            </label>
            <select
              id="motor-select"
              value={selectMode}
              onChange={handleSelectChange}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl px-3 py-2 transition-colors appearance-none"
            >
              {SUPPORTED_MODELS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div className="mt-3 p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-lg">
              <p className="text-xs text-sky-800 dark:text-sky-200/80 flex gap-2 items-start">
                <Cpu size={14} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Modelos WebGPU</strong> rodam no seu navegador usando o hardware do seu dispositivo. A primeira execução fará o download de múltiplos MB/GB de dados para o cache.
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white dark:text-black bg-slate-900 dark:bg-slate-200 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-md transition-colors"
          >
            Salvar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
