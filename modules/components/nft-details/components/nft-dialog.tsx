import { Button, Label, TextField } from '@/modules/app'
import { Dialog } from '@/modules/app/component/dialog'
import { decimalOffChain } from '@/modules/blockchain'
import { CROSSFI_MINTER_ADDRESS } from '@/utils/configs'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

type NFTDialogProps = {
  id: string
  src: string
  type?: string
  title: string
  placeholder?: string
  ctaText?: string
  onClick: () => void
  secondaryOnClick?: () => void
  onChange?: (value: string) => void
  value: string
  disabled?: boolean
  nftList?: any
  onBuyOutChange?: (value: string) => void
  buyOutValue?: string
  setTimestamp?: (value: Date) => void
  onClose: () => void // Add this new prop
  contractAddress: string
}

export function NFTDialog({
  id,
  src,
  type,
  title,
  placeholder,
  ctaText,
  onClick,
  secondaryOnClick,
  onChange,
  value,
  disabled,
  nftList,
  onBuyOutChange,
  buyOutValue,
  setTimestamp,
  onClose, // Add this to the destructured props
  contractAddress,
}: NFTDialogProps) {
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const [listingType, setListingType] = useState<'listing' | 'auction'>('listing')
  const [selectedDate, setSelectedDate] = useState<Date>(oneWeekFromNow)

  useEffect(() => {
    setTimestamp?.(selectedDate)
  }, [selectedDate, setTimestamp])

  const isAuctionRestricted = contractAddress.toLowerCase() === CROSSFI_MINTER_ADDRESS.toLowerCase()

  const handleDateChange = (date: Date | null) => {
    const newDate = date || oneWeekFromNow
    setSelectedDate(newDate)
  }

  const renderCreateContent = () => (
    <>
      {id === 'none' && !isAuctionRestricted && (
        <div className="flex justify-center mb-4">
          <div className="flex bg-[#1B1F26B8] rounded-lg p-1">
            {['listing', 'auction'].map((type) => (
              <button
                key={type}
                onClick={() => setListingType(type as 'listing' | 'auction')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  listingType === type ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAuctionRestricted && (
        <div className="bg-gray-800 border border-gray-700 rounded-md p-4 mb-4">
          <h4 className="text-sm font-medium mb-2">Note:</h4>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>Auction is not supported NFTs in this Collection.</li>
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label htmlFor="amount">
          {listingType === 'auction' ? 'Starting Bid' : 'Listing Price'}
        </Label>
        <TextField
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          type="number"
          id="amount"
          placeholder={listingType === 'auction' ? 'Starting Bid' : 'Listing Price'}
          className="resize-none bg-[#1B1F26B8] placeholder:font-medium"
        />
      </div>

      {listingType === 'auction' && (
        <div className="flex flex-col gap-3">
          <Label htmlFor="reservePrice">Buyout Price</Label>
          <TextField
            value={buyOutValue}
            onChange={(e) => onBuyOutChange?.(e.target.value)}
            type="number"
            id="reservePrice"
            placeholder="Buyout Price"
            className="resize-none bg-[#1B1F26B8] placeholder:font-medium"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-white font-medium text-sm">Duration</p>
        <div className="flex w-full items-center gap-4">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            placeholderText={placeholder}
            className="bg-background border border-dialog-border rounded-xl w-1/2 py-[.625rem] px-2.5 text-sm"
            minDate={new Date()}
          />
          <div className="bg-background border border-dialog-border rounded-xl flex justify-between w-[65%] py-[.625rem] px-2.5">
            <p className="font-medium text-sm">
              {selectedDate ? selectedDate.toDateString() : 'Select Date'}
            </p>
            <p className="font-medium text-sm">
              {selectedDate ? selectedDate.toLocaleTimeString() : 'Time'}
            </p>
          </div>
        </div>
      </div>

      <Button
        disabled={disabled || (isAuctionRestricted && listingType === 'auction')}
        onClick={listingType === 'listing' ? onClick : secondaryOnClick}
        variant="secondary"
        className="h-8"
      >
        {disabled
          ? 'Loading...'
          : isAuctionRestricted && listingType === 'auction'
          ? 'Auction not available'
          : listingType === 'listing'
          ? 'List NFT'
          : 'Auction NFT'}
      </Button>
    </>
  )

  const renderBidContent = () => (
    <>
      <div className="flex flex-col gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-md p-4 mb-4">
          <h4 className="text-sm font-medium mb-2">Note:</h4>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>Bid amount must be greater than the minimum bid amount.</li>
            <li>
              If bid amount is greater than buyout price, the buyout price will be used instead.
            </li>
            <li>
              If the buyout price is reached, the auction will end and the NFT will be sold to the
              highest bidder.
            </li>
          </ul>
        </div>
        <Label htmlFor="amount">Bid Amount</Label>
        <TextField
          value={value}
          onChange={(e) => {
            const inputValue = parseFloat(e.target.value)
            const minimumBidAmount = decimalOffChain(nftList?.minimumBidAmount)
            const buyoutBidAmount = decimalOffChain(nftList?.buyoutBidAmount)

            onChange?.(
              inputValue >= Number(minimumBidAmount)
                ? inputValue > Number(buyoutBidAmount)
                  ? buyoutBidAmount!.toString()
                  : e.target.value
                : e.target.value,
            )
          }}
          type="number"
          id="amount"
          placeholder={`Minimum bid is ${decimalOffChain(nftList?.minimumBidAmount)} XFI`}
          className="resize-none bg-[#1B1F26B8] placeholder:font-medium"
        />
      </div>
      <Button disabled={disabled} onClick={onClick} variant="secondary" className="h-8">
        {disabled ? 'Loading...' : ctaText}
      </Button>
    </>
  )

  const renderMakeOfferContent = () => (
    <>
      <div className="flex flex-col gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-md p-4 mb-4">
          <h4 className="text-sm font-medium mb-2">Note:</h4>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>Offers are made in WXFI.</li>
            <li>
              Don&apos;t have WXFI? Don&apos;t worry, we&apos;ll handle the conversion for you.
            </li>
            <li>
              You can also{' '}
              <Link href="/swap" className="cursor-pointer hover:underline text-blue-500">
                swap for WXFI
              </Link>{' '}
              manually.
            </li>
          </ul>
        </div>
        <Label htmlFor="amount">Offer Amount</Label>
        <TextField
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          type="number"
          id="amount"
          placeholder="Make Offer"
          className="resize-none bg-[#1B1F26B8] placeholder:font-medium"
        />
      </div>
      <Button disabled={disabled} onClick={onClick} variant="secondary" className="h-8">
        {disabled ? 'Loading...' : ctaText}
      </Button>
    </>
  )

  return (
    <div className="w-full flex gap-8 justify-between relative">
      <button
        onClick={onClose}
        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white"
        aria-label="Close dialog"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div className="w-full flex gap-8 justify-between">
        <div className="!rounded-lg relative w-[230px] h-[230px]">
          <Image
            src={src}
            alt={title}
            layout="fill"
            className="aspect-square absolute inset-0 rounded-lg"
          />
        </div>
        <div className="w-[80%] flex flex-col gap-[30px]">
          <Dialog.Title>
            <h5 className="font-medium text-center first-letter:uppercase ">
              {id === 'none' ? 'Create' : id} - {title}
            </h5>
          </Dialog.Title>
          {type === 'create'
            ? renderCreateContent()
            : type === 'make-offer'
            ? renderMakeOfferContent()
            : renderBidContent()}
        </div>
      </div>
    </div>
  )
}
