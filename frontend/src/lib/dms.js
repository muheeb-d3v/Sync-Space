export const getDmPartner = (dm, currentUserId) => {
    const members = dm?.members ?? [];
    if (members.length === 0) return null;

    return (
        members.find(
            (member) => String(member?._id ?? member) !== String(currentUserId)
        ) ?? members[0]
    );
};

export const getMemberName = (user) =>
    user?.username || user?.email || 'Unknown user';
