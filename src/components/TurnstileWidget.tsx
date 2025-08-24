import React from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

interface TurnstileWidgetProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
    onVerify,
    onError,
    onExpire
}) => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    const enabled = import.meta.env.VITE_TURNSTILE_ENABLED === 'true';

    if (!enabled || !siteKey) {
        return null;
    }

    return (
        <div className="flex justify-center">
            <Turnstile
                siteKey={siteKey}
                onSuccess={onVerify}
                onError={onError}
                onExpire={onExpire}
                theme="light"
                size="normal"
            />
        </div>
    );
};

export default TurnstileWidget;