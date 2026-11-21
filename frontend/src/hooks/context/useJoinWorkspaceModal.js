import { useContext } from 'react';

import JoinWorkspaceContext from '@/context/JoinWorkspaceContext';

export const useJoinWorkspaceModal = () => {
    return useContext(JoinWorkspaceContext);
};
