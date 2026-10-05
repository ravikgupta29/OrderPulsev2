import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../shared/utils/format';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'secondary', isLoading, className, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('op-button', `op-button--${variant}`, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? 'Working…' : children}
    </button>
  );
}
