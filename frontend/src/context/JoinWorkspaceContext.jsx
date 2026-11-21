 import { createContext, useState } from 'react';

const JoinWorkspaceContext = createContext();

export const JoinWorkspaceContextProvider = ({ children }) => {

    const [openJoinWorkspaceModal, setOpenJoinWorkspaceModal] = useState(false);

    return (
        <JoinWorkspaceContext.Provider value={{openJoinWorkspaceModal, setOpenJoinWorkspaceModal}}>
            {children}
        </JoinWorkspaceContext.Provider>
    );
};

export default JoinWorkspaceContext;
