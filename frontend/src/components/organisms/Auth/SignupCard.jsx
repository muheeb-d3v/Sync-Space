import { Button, Card, CardBody, Chip, Divider, Input, Spinner } from '@heroui/react';
import {
    CheckCircle2Icon,
    EyeIcon,
    EyeOffIcon,
    LockKeyholeIcon,
    MailIcon,
    TriangleAlert,
    UserIcon
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const inputClassNames = {
    input: 'text-sm text-gray-900 placeholder:text-gray-400',
    inputWrapper:
        'h-11 border-0 bg-[#f4f3f7] shadow-none data-[hover=true]:bg-[#efedf5]'
};

const labelClass = 'mb-1.5 block text-[12px] font-medium text-gray-600';

function PasswordToggle({ visible, onToggle, label }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-400/40"
            aria-label={label}
        >
            {visible ? (
                <EyeOffIcon className="size-4" />
            ) : (
                <EyeIcon className="size-4" />
            )}
        </button>
    );
}

export const SignUpCard = ({
    signupForm,
    setSignupForm,
    validationError,
    onSignupFormSubmit,
    error,
    isPending,
    isSuccess
}) => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const message = validationError?.message || error?.message;

    return (
        <Card
            className="auth-card-shadow w-full rounded-[18px] border border-gray-200/80 bg-white"
            radius="lg"
        >
            <CardBody className="p-6 sm:p-7">
                <Chip
                    size="sm"
                    variant="flat"
                    radius="full"
                    classNames={{
                        base: 'auth-kicker h-6 self-start px-2.5',
                        content: 'auth-kicker-text text-[11px] font-medium'
                    }}
                >
                    Get started
                </Chip>

                <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.025em] text-gray-900">
                    Create your account
                </h1>
                <p className="mt-1.5 text-[13.5px] leading-6 text-gray-500">
                    Set up your profile and join your team in SyncSpace.
                </p>

                {message && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-3 text-xs text-red-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p className="leading-5">{message}</p>
                    </div>
                )}

                {isSuccess && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 text-xs text-emerald-800">
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
                        <p className="flex-1 leading-5">
                            Account created. Taking you to the sign-in page…
                        </p>
                        <Spinner size="sm" color="success" className="mt-0.5" />
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={onSignupFormSubmit}>
                    <div>
                        <label htmlFor="signup-username" className={labelClass}>
                            Username
                        </label>
                        <Input
                            id="signup-username"
                            autoComplete="username"
                            classNames={inputClassNames}
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="e.g. maya"
                            radius="lg"
                            size="lg"
                            startContent={
                                <UserIcon className="mr-2 size-4 shrink-0 text-gray-400" />
                            }
                            type="text"
                            value={signupForm.username}
                            variant="flat"
                            onValueChange={(value) =>
                                setSignupForm({ ...signupForm, username: value })
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="signup-email" className={labelClass}>
                            Email
                        </label>
                        <Input
                            id="signup-email"
                            autoComplete="email"
                            classNames={inputClassNames}
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="you@company.com"
                            radius="lg"
                            size="lg"
                            startContent={
                                <MailIcon className="mr-2 size-4 shrink-0 text-gray-400" />
                            }
                            type="email"
                            value={signupForm.email}
                            variant="flat"
                            onValueChange={(value) =>
                                setSignupForm({ ...signupForm, email: value })
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="signup-password" className={labelClass}>
                            Password
                        </label>
                        <Input
                            id="signup-password"
                            autoComplete="new-password"
                            classNames={inputClassNames}
                            endContent={
                                <PasswordToggle
                                    visible={showPassword}
                                    onToggle={() =>
                                        setShowPassword((visible) => !visible)
                                    }
                                    label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                />
                            }
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="Create a password"
                            radius="lg"
                            size="lg"
                            startContent={
                                <LockKeyholeIcon className="mr-2 size-4 shrink-0 text-gray-400" />
                            }
                            type={showPassword ? 'text' : 'password'}
                            value={signupForm.password}
                            variant="flat"
                            onValueChange={(value) =>
                                setSignupForm({ ...signupForm, password: value })
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="signup-confirm-password" className={labelClass}>
                            Confirm password
                        </label>
                        <Input
                            id="signup-confirm-password"
                            autoComplete="new-password"
                            classNames={inputClassNames}
                            endContent={
                                <PasswordToggle
                                    visible={showConfirmPassword}
                                    onToggle={() =>
                                        setShowConfirmPassword((visible) => !visible)
                                    }
                                    label={
                                        showConfirmPassword
                                            ? 'Hide password confirmation'
                                            : 'Show password confirmation'
                                    }
                                />
                            }
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="Repeat your password"
                            radius="lg"
                            size="lg"
                            startContent={
                                <LockKeyholeIcon className="mr-2 size-4 shrink-0 text-gray-400" />
                            }
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={signupForm.confirmPassword}
                            variant="flat"
                            onValueChange={(value) =>
                                setSignupForm({
                                    ...signupForm,
                                    confirmPassword: value
                                })
                            }
                        />
                    </div>

                    <Button
                        className="auth-primary-button mt-1 w-full font-medium"
                        color="primary"
                        isDisabled={isSuccess}
                        isLoading={isPending}
                        radius="lg"
                        size="lg"
                        type="submit"
                    >
                        Create account
                    </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <Divider className="flex-1" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">
                        Already a member?
                    </span>
                    <Divider className="flex-1" />
                </div>

                <Button
                    className="w-full text-[13px] text-gray-500"
                    radius="lg"
                    variant="light"
                    onPress={() => navigate('/auth/signin')}
                >
                    Sign in
                </Button>
            </CardBody>
        </Card>
    );
};
