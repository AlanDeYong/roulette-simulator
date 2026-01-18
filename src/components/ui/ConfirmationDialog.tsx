
import React from 'react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md border-primary/20 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                        <CardTitle className="text-lg">{title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                        {message}
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button variant="default" size="sm" onClick={onConfirm}>
                            Confirm
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
