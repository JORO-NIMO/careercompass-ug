import React from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface HCaptchaWidgetProps {
  sitekey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (err: any) => void;
  disabled?: boolean;
}

const HCaptchaWidget: React.FC<HCaptchaWidgetProps> = ({ sitekey, onVerify, onExpire, onError, disabled }) => {
  return (
    <div className="my-2">
      <HCaptcha
        sitekey={sitekey}
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
        disabled={disabled}
      />
    </div>
  );
};

export default HCaptchaWidget;
