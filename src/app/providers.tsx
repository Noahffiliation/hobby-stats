'use client'

import { HeroUIProvider } from '@heroui/react';
import React from 'react';

export function Providers({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  )
}
