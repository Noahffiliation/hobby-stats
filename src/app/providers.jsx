'use client'

import { HeroUIProvider } from '@heroui/react';
import PropTypes from 'prop-types';

export function Providers({children}) {
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  )
}

Providers.propTypes = {
  children: PropTypes.node.isRequired
}
