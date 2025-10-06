'use client';

interface AdPlaceholderProps {
  type?: 'banner' | 'square' | 'vertical';
  className?: string;
}

export default function AdPlaceholder({ type = 'banner', className = '' }: AdPlaceholderProps) {
  const getAdDimensions = () => {
    switch (type) {
      case 'banner':
        return { width: 728, height: 90, text: 'Leaderboard Ad' };
      case 'square':
        return { width: 300, height: 250, text: 'Square Ad' };
      case 'vertical':
        return { width: 160, height: 600, text: 'Vertical Ad' };
      default:
        return { width: 728, height: 90, text: 'Leaderboard Ad' };
    }
  };

  const dimensions = getAdDimensions();

  return (
    <div className={`text-center my-6 ${className}`}>
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center mx-auto"
        style={{ 
          width: type === 'banner' ? '100%' : `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          maxWidth: '100%'
        }}
      >
        <div className="text-center p-4">
          <div className="text-gray-500 text-sm mb-2">Advertisement</div>
          <div className="text-gray-400 text-xs mb-1">{dimensions.text}</div>
          <div className="text-gray-300 text-xs">
            {dimensions.width} × {dimensions.height}
          </div>
          {/* <div className="text-gray-400 text-xs mt-2">
            AdSense will appear here after approval
          </div> */}
        </div>
      </div>
    </div>
  );
}