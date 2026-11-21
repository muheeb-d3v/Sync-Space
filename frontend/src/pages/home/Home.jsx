import { useQueryClient } from '@tanstack/react-query';
import { Loader, PlusIcon, SearchIcon, ChevronRightIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useFetchWorkspace } from '@/hooks/apis/workspaces/useFetchWorkspace';
import { useJoinWorkspaceModal } from '@/hooks/context/useJoinWorkspaceModal';
import { useCreateWorkspaceModal } from '@/hooks/context/useCreateWorkspaceModal';
import { useToast } from '@/hooks/use-toast';

const Home = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { toast } = useToast();

    const { isFetching, workspaces } = useFetchWorkspace();
    const { setOpenJoinWorkspaceModal } = useJoinWorkspaceModal();
    const { setOpenCreateWorkspaceModal } = useCreateWorkspaceModal();

    useEffect(() => {
        if (isFetching) return;
        if (workspaces?.length > 0) {
            navigate(`/workspaces/${workspaces[0]._id}`);
        }
    }, [isFetching, workspaces, navigate]);

    if (isFetching) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slack">
                <Loader className="animate-spin size-8 text-white" />
            </div>
        );
    }

    // Signed-in user with no workspaces yet: offer to create one or join one.
    return (
        <div className="min-h-screen w-full bg-white flex flex-col font-sans">
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-2xl">
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
                        Start with a workspace
                    </h1>
                    <p className="text-gray-600 text-lg leading-relaxed mb-12">
                        In SyncSpace, everything happens in a workspace. Like a virtual office building,
                        a workspace is where your team can gather in SyncSpace to communicate and get work
                        done.
                    </p>

                    {/* Find your SyncSpace workspace card */}
                    <div className="group relative mb-8">
                        <button
                            onClick={() => setOpenJoinWorkspaceModal(true)}
                            className="flex items-center justify-between w-full px-6 py-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                    <SearchIcon className="size-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">
                                        Find your SyncSpace workspace
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Join or sign in to existing workspaces.
                                    </p>
                                </div>
                            </div>
                            <ChevronRightIcon className="size-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-full h-full rounded-xl border-2 border-green-500 bg-green-50/50" />
                        </div>
                    </div>

                    {/* Create a new workspace card */}
                    <div className="group relative">
                        <button
                            onClick={() => setOpenCreateWorkspaceModal(true)}
                            className="flex items-center justify-between w-full px-6 py-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <PlusIcon className="size-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">
                                        Create a new workspace
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Get your company or organization on SyncSpace.
                                    </p>
                                </div>
                            </div>
                            <ChevronRightIcon className="size-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </button>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-full h-full rounded-xl border-2 border-blue-500 bg-blue-50/50" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Home;
