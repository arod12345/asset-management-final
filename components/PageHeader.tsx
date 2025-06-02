"use client";

interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}
    </div>
  );
}
