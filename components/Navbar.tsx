import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

const Navbar = () => {
  return (
    <header>
      <nav>
        <Link href="/" >
          <Image src="/icons/logo.svg" alt="logo" width={24} height={24} />
          <p>DevEvents</p>
        </Link>

        <ul>
          <Link href="/">Home</Link>
          <Link href="/">Events</Link>
          <Link href="/">Create Events</Link>
        </ul>
      </nav>
    </header>
  )
}

export default Navbar