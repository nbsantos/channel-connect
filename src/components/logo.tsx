import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  className?: string;
  height?: number;
  priority?: boolean;
}

export function Logo({ href = "/", className = "", height = 36, priority = false }: LogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt="Channel Connect"
      width={height * 4}
      height={height}
      className={`h-auto w-auto ${className}`}
      style={{ height }}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{image}</span>;
}
