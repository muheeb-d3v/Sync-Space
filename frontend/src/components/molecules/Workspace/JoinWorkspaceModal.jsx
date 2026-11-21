import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useJoinWorkspace } from '@/hooks/apis/workspaces/useJoinWorkspace';
import { useJoinWorkspaceModal } from '@/hooks/context/useJoinWorkspaceModal';
import { useToast } from '@/hooks/use-toast';

export const JoinWorkspaceModal = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { openJoinWorkspaceModal, setOpenJoinWorkspaceModal } = useJoinWorkspaceModal();

    const { isPending, joinWorkspaceMutation } = useJoinWorkspace();

    const [joinCode, setJoinCode] = useState('');

    function handleClose() {
        setOpenJoinWorkspaceModal(false);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const code = joinCode.trim();
        if (!code) return;
        try {
            const workspace = await joinWorkspaceMutation({ joinCode: code });
            queryClient.invalidateQueries({ queryKey: ['fetchWorkspaces'] });
            queryClient.invalidateQueries({ queryKey: [`fetchWorkspaceById-${workspace._id}`] });
            toast({ title: `Joined ${workspace?.name}` });
            navigate(`/workspaces/${workspace._id}`);
            setJoinCode('');
        } catch (error) {
            toast({
                title: error?.message || 'Could not join workspace',
                variant: 'destructive'
            });
        }
    }

    return (
        <Dialog
            open={openJoinWorkspaceModal}
            onOpenChange={handleClose}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a workspace</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
                    <Input
                        required
                        disabled={isPending}
                        placeholder="Enter join code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                    />

                    <Button
                        type="submit"
                        disabled={isPending || joinCode.trim().length === 0}
                        className="w-full"
                    >
                        {isPending ? 'Joining...' : 'Join workspace'}
                    </Button>
                </form>

            </DialogContent>
        </Dialog>
    );
};
