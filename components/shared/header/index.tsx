import Image from 'next/image'
import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'

import { Button } from '@/components/ui/button'
import { ShoppingCart, UserIcon } from 'lucide-react'

const Header = async () => {
  return (
    <header className="w-full border-b">
      <div className="wrapper flex-between">
        <div className="flex-start">
          <Link href="/" className="flex-start">
            <Image
              src="/assets/icons/logo.png"
              width={48}
              height={48}
              alt={`${APP_NAME} logo`}
            />
            {APP_NAME}
          </Link>
        </div>
        <div className="space-x-2">
          <Button asChild variant="ghost">
            <Link href="/cart">
              <ShoppingCart />
              Cart
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cart">
              <UserIcon />
              Sign In
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header
