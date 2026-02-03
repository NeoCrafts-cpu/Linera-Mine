import React from 'react';

interface SkillsBadgeProps {
  skills: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  matchedSkills?: string[];
}

/**
 * Displays a list of skill badges
 */
export const SkillsBadge: React.FC<SkillsBadgeProps> = ({ 
  skills, 
  maxDisplay = 4,
  size = 'sm',
  matchedSkills = []
}) => {
  if (!skills || skills.length === 0) return null;

  const displaySkills = skills.slice(0, maxDisplay);
  const remainingCount = skills.length - maxDisplay;
  const matchedSet = new Set(matchedSkills.map(s => s.toLowerCase()));

  const sizeClasses = size === 'sm' 
    ? 'text-[8px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-1';

  return (
    <div className="flex flex-wrap gap-1">
      {displaySkills.map((skill, index) => {
        const isMatched = matchedSet.has(skill.toLowerCase());
        return (
          <span 
            key={index}
            className={`${sizeClasses} uppercase tracking-wider rounded-sm ${
              isMatched 
                ? 'bg-mc-emerald/30 text-mc-emerald border border-mc-emerald/50'
                : 'bg-mc-amethyst/20 text-mc-amethyst border border-mc-amethyst/30'
            }`}
          >
            {skill}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className={`${sizeClasses} text-mc-text-dark bg-mc-stone/30 rounded-sm`}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};

interface RequiredSkillsInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestedSkills?: string[];
}

// Common AI/tech skills for suggestions
const COMMON_SKILLS = [
  'Python', 'TypeScript', 'Rust', 'Machine Learning', 'NLP',
  'Computer Vision', 'Data Analysis', 'GPT', 'LLMs', 'Smart Contracts',
  'Web Scraping', 'API Development', 'RAG', 'Fine-tuning', 'Research'
];

/**
 * Input component for selecting required skills with suggestions
 */
export const RequiredSkillsInput: React.FC<RequiredSkillsInputProps> = ({
  value,
  onChange,
  suggestedSkills = COMMON_SKILLS
}) => {
  const currentSkills = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const currentSkillsSet = new Set(currentSkills.map(s => s.toLowerCase()));

  const addSkill = (skill: string) => {
    if (!currentSkillsSet.has(skill.toLowerCase())) {
      const newValue = currentSkills.length > 0 
        ? `${value}, ${skill}`
        : skill;
      onChange(newValue);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const newSkills = currentSkills.filter(s => s.toLowerCase() !== skillToRemove.toLowerCase());
    onChange(newSkills.join(', '));
  };

  return (
    <div>
      {/* Input field */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-mc-ui-bg-dark border-3 border-mc-stone focus:border-mc-diamond p-2.5 text-mc-text-light text-xs focus:outline-none transition-colors placeholder-mc-text-dark mb-2"
        placeholder="e.g., Python, Machine Learning, NLP"
      />

      {/* Current skills as removable badges */}
      {currentSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {currentSkills.map((skill, index) => (
            <span 
              key={index}
              className="text-[9px] px-2 py-1 bg-mc-diamond/20 text-mc-diamond border border-mc-diamond/30 rounded-sm flex items-center gap-1 cursor-pointer hover:bg-mc-redstone/20 hover:text-mc-redstone hover:border-mc-redstone/30 transition-colors group"
              onClick={() => removeSkill(skill)}
              title="Click to remove"
            >
              {skill}
              <span className="text-mc-text-dark group-hover:text-mc-redstone">×</span>
            </span>
          ))}
        </div>
      )}

      {/* Quick add suggestions */}
      <div className="flex flex-wrap gap-1">
        <span className="text-[8px] text-mc-text-dark mr-1">Quick add:</span>
        {suggestedSkills.slice(0, 6).map((skill, index) => (
          !currentSkillsSet.has(skill.toLowerCase()) && (
            <button
              key={index}
              type="button"
              onClick={() => addSkill(skill)}
              className="text-[8px] px-1.5 py-0.5 bg-mc-stone/30 text-mc-text-dark border border-mc-stone/50 rounded-sm hover:bg-mc-diamond/20 hover:text-mc-diamond hover:border-mc-diamond/30 transition-colors"
            >
              + {skill}
            </button>
          )
        ))}
      </div>
    </div>
  );
};

interface SkillMatchIndicatorProps {
  requiredSkills: string[];
  agentSkills: string[];
}

/**
 * Shows a skill match percentage between job requirements and agent skills
 */
export const SkillMatchIndicator: React.FC<SkillMatchIndicatorProps> = ({
  requiredSkills,
  agentSkills
}) => {
  if (!requiredSkills || requiredSkills.length === 0) return null;

  const agentSkillsSet = new Set((agentSkills || []).map(s => s.toLowerCase()));
  const matchedCount = requiredSkills.filter(skill => 
    agentSkillsSet.has(skill.toLowerCase())
  ).length;

  const matchPercentage = Math.round((matchedCount / requiredSkills.length) * 100);

  let colorClass = 'mc-text-dark';
  let bgClass = 'bg-mc-stone/30';
  let label = 'Low Match';

  if (matchPercentage >= 80) {
    colorClass = 'mc-emerald';
    bgClass = 'bg-mc-emerald/20';
    label = 'Great Match!';
  } else if (matchPercentage >= 50) {
    colorClass = 'mc-gold';
    bgClass = 'bg-mc-gold/20';
    label = 'Good Match';
  } else if (matchPercentage > 0) {
    colorClass = 'mc-diamond';
    bgClass = 'bg-mc-diamond/20';
    label = 'Partial Match';
  }

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-sm ${bgClass}`}>
      <div className="flex-1 h-1.5 bg-mc-stone/50 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-${colorClass} transition-all duration-300`}
          style={{ width: `${matchPercentage}%` }}
        />
      </div>
      <span className={`text-[9px] text-${colorClass} font-bold whitespace-nowrap`}>
        {matchedCount}/{requiredSkills.length} {label}
      </span>
    </div>
  );
};

export default SkillsBadge;
