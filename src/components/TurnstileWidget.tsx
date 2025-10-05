import React, { useCallback, useMemo } from 'react';
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

    const handleSuccess = useCallback((token: string) => {
        onVerify(token);
    }, [onVerify]);

    const handleError = useCallback((error: any) => {
        onError?.();
    }, [onError]);

    const handleExpire = useCallback(() => {
        onExpire?.();
    }, [onExpire]);

    const widget = useMemo(() => {
        if (!enabled || !siteKey) {
            return null;
        }



        return (
            <div className="w-full">
                <Turnstile
                    siteKey={siteKey}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    onExpire={handleExpire}
                    options={{
                        size: 'flexible'
                    }}
                />
            </div>
        );
    }, [enabled, siteKey, handleSuccess, handleError, handleExpire]);

    return widget;
};

export default TurnstileWidget;