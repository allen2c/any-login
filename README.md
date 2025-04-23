# Any-Login SSO Frontend

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), serving as the frontend interface for the Any-Login Single Sign-On (SSO) service[cite: 13, 22].

## Project Overview

* **Framework:** [Next.js](https://nextjs.org) (App Router) [cite: 5, 13, 18]
* **Language:** [TypeScript](https://www.typescriptlang.org/) [cite: 14, 17, 18, 23]
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) [cite: 4, 13, 43]
* **Authentication:** Handles user registration[cite: 83, 87], login (password-based [cite: 243, 248] and Google OAuth [cite: 123, 203, 262]), and session management via HttpOnly cookies (`accessToken`, `refreshToken`)[cite: 166, 168, 181, 182, 196, 197, 227, 231, 241]. It acts as a proxy[cite: 210, 215], forwarding authentication requests to a backend API service defined by `AUTH_API_URL`[cite: 130, 174, 210].
* **Font:** [Geist](https://vercel.com/font) (Sans and Mono) [cite: 8, 20, 21, 43]

## Getting Started

First, ensure you have Node.js and a package manager (npm, yarn, pnpm, or bun) installed.

1. **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

2. **Configure Environment Variables:**
    Create a `.env.local` file in the project root and add the necessary environment variables, such as:
    * `AUTH_API_URL`: The base URL of your backend Any-Auth service[cite: 130, 174, 210].
    * `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID[cite: 130, 203].
    * `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret[cite: 131].
    * `NEXT_PUBLIC_URL`: The public URL where this frontend is hosted (e.g., `http://localhost:3000`)[cite: 131, 204].
    * `BACKEND_CLIENT_ID` (Optional): Client ID for backend API authentication[cite: 171, 200, 211].
    * `BACKEND_CLIENT_SECRET` (Optional): Client Secret for backend API authentication[cite: 172, 201, 212].

3. **Run the Development Server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
    This command uses Turbopack for faster development builds[cite: 13].

Open [http://localhost:3000](http://localhost:3000) (or your configured URL) with your browser to see the result[cite: 6].

You can start editing the main page by modifying `app/page.tsx`[cite: 7]. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

* [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API[cite: 9].
* [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial[cite: 10].

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome! [cite: 10]

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js[cite: 11].

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details[cite: 12]. Remember to configure your environment variables in your Vercel project settings.
