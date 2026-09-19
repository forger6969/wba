import { 
  TbBrandPython, 
  TbBrandHtml5, 
  TbBrandJavascript, 
  TbDatabase, 
  TbServer, 
  TbDeviceMobile, 
  TbPalette, 
  TbTerminal,
  TbBook
} from 'react-icons/tb';

export default function TrainingTypeIcon({ name = '', icon = '', className = 'w-12 h-12 text-xl' }) {
  const normName = name.toLowerCase();
  const normIcon = (icon || '').toLowerCase();

  let IconComponent = TbBook;
  let bgClass = 'bg-[#F0F5E9]';
  let colorClass = 'text-[#5E6E52]';
  let isEmoji = false;

  // Check if icon is an emoji
  if (icon && icon.trim() && !/^[a-zA-Z0-9_-]+$/.test(icon.trim())) {
    isEmoji = true;
  }

  // Matching logic
  if (normIcon === 'python' || normName.includes('python') || normName.includes('питон') || icon === '🐍') {
    IconComponent = TbBrandPython;
    bgClass = 'bg-[#E3F2FD]';
    colorClass = 'text-[#1976D2]';
  } else if (
    normIcon === 'web' || 
    normIcon === 'frontend' || 
    normName.includes('web') || 
    normName.includes('веб') || 
    normName.includes('frontend') || 
    normName.includes('фронтенд') ||
    normName.includes('javascript') ||
    normName.includes('js')
  ) {
    IconComponent = TbBrandHtml5;
    bgClass = 'bg-[#EBF2FE]';
    colorClass = 'text-[#3B82F6]';
  } else if (
    normIcon === 'backend' || 
    normIcon === 'server' || 
    normName.includes('backend') || 
    normName.includes('бэкенд') || 
    normName.includes('server') || 
    normName.includes('database') ||
    normName.includes('бд') ||
    normName.includes('sql')
  ) {
    IconComponent = TbServer;
    bgClass = 'bg-[#F3E5F5]';
    colorClass = 'text-[#9C27B0]';
  } else if (
    normIcon === 'mobile' || 
    normName.includes('mobile') || 
    normName.includes('мобайл') || 
    normName.includes('android') || 
    normName.includes('ios') ||
    normName.includes('flutter')
  ) {
    IconComponent = TbDeviceMobile;
    bgClass = 'bg-[#EFEBE9]';
    colorClass = 'text-[#5D4037]';
  } else if (
    normIcon === 'design' || 
    normName.includes('design') || 
    normName.includes('дизайн') || 
    normName.includes('figma') || 
    normName.includes('фигма')
  ) {
    IconComponent = TbPalette;
    bgClass = 'bg-[#FCE4EC]';
    colorClass = 'text-[#E91E63]';
  } else if (
    normIcon === 'qa' || 
    normName.includes('qa') || 
    normName.includes('тестирование') || 
    normName.includes('testing')
  ) {
    IconComponent = TbTerminal;
    bgClass = 'bg-[#E0F2F1]';
    colorClass = 'text-[#00897B]';
  }

  if (isEmoji) {
    return (
      <div className={`flex items-center justify-center rounded-xl shrink-0 bg-[#F6FBEA] border border-[#E6EDD8] font-bold ${className}`}>
        {icon}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-xl shrink-0 ${bgClass} ${colorClass} ${className}`}>
      <IconComponent className="w-[60%] h-[60%]" />
    </div>
  );
}
