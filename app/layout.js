import './globals.css';

export const metadata = {
  title: 'AI-CRM — учёт клиентов и продажи',
  description: 'AI-CRM для автоматизации B2B-продаж: учёт клиентов, ключевые даты, сообщения и коммерческие предложения.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
