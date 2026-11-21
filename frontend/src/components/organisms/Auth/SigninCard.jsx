import { Button, Card, CardBody, Chip, Divider, Input, Spinner } from '@heroui/react';
import {
    CheckCircle2Icon,
    EyeIcon,
    EyeOffIcon,
    LockKeyholeIcon,
    MailIcon,
    TriangleAlert
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const inputClassNames = {
    input: 'text-sm text-gray-900 placeholder:text-gray-400',
    inputWrapper:
        'h-11 border-0 bg-[#f4f3f7] shadow-none data-[hover=true]:bg-[#efedf5]'
};

const labelClass = 'mb-1.5 block text-[12px] font-medium text-gray-600';

export const SigninCard = ({
    signinForm,
    setSigninForm,
    onSigninFormSubmit,
    validationError,
    error,
    isSuccess,
    isPending
}) => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

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
                    Welcome back
                </Chip>

                <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.025em] text-gray-900">
                    Sign in to SyncSpace
                </h1>
                <p className="mt-1.5 text-[13.5px] leading-6 text-gray-500">
                    Enter your workspace credentials to pick up where your team
                    left off.
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
                            Signed in successfully. Redirecting you to your
                            workspace…
                        </p>
                        <Spinner size="sm" color="success" className="mt-0.5" />
                    </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={onSigninFormSubmit}>
                    <div>
                        <label htmlFor="signin-email" className={labelClass}>
                            Email
                        </label>
                        <Input
                            id="signin-email"
                            autoComplete="email"
                            classNames={inputClassNames}
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="you@company.com"
                            radius="lg"
                            size="lg"
                            startContent={<MailIcon className="mr-2 size-4 shrink-0 text-gray-400" />}
                            type="email"
                            value={signinForm.email}
                            variant="flat"
                            onValueChange={(value) =>
                                setSigninForm({ ...signinForm, email: value })
                            }
                        />
                    </div>

                    <div>
                        <label htmlFor="signin-password" className={labelClass}>
                            Password
                        </label>
                        <Input
                            id="signin-password"
                            autoComplete="current-password"
                            classNames={inputClassNames}
                            endContent={
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((visible) => !visible)
                                    }
                                    className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-400/40"
                                    aria-label={
                                        showPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="size-4" />
                                    ) : (
                                        <EyeIcon className="size-4" />
                                    )}
                                </button>
                            }
                            isDisabled={isPending || isSuccess}
                            isRequired
                            placeholder="Enter your password"
                            radius="lg"
                            size="lg"
                            startContent={
                                <LockKeyholeIcon className="mr-2 size-4 shrink-0 text-gray-400" />
                            }
                            type={showPassword ? 'text' : 'password'}
                            value={signinForm.password}
                            variant="flat"
                            onValueChange={(value) =>
                                setSigninForm({ ...signinForm, password: value })
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
                        Sign in
                    </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <Divider className="flex-1" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-500">
                        New to SyncSpace?
                    </span>
                    <Divider className="flex-1" />
                </div>

                <Button
                    className="w-full text-[13px] text-gray-500"
                    radius="lg"
                    variant="light"
                    onPress={() => navigate('/auth/signup')}
                >
                    Create an account
                </Button>
            </CardBody>
        </Card>
    );
};
