import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@zam/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "group/button aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 ease-intent focus-visible:outline-ring inline-flex shrink-0 items-center justify-center border bg-clip-padding font-medium tracking-[-0.01em] whitespace-nowrap transition-[background-color,color,border-color,transform] duration-500 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-3 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-brand hover:text-brand-foreground border-transparent",
        outline:
          "border-border hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent bg-transparent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-brand hover:text-brand-foreground border-transparent",
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent border-transparent",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40 border-transparent",
        link: "text-foreground decoration-foreground/30 hover:decoration-foreground border-transparent underline underline-offset-4",
      },
      size: {
        default:
          "h-10 gap-2 rounded-xl px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-lg px-3.5 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-1.5 rounded-2xl px-7 text-sm has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10 rounded-xl",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
