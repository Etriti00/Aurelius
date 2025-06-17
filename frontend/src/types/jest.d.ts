import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attribute: string, value?: string): R;
      toHaveValue(value: string | number): R;
      toBeDisabled(): R;
      toHaveTextContent(text: string): R;
    }
  }
}