'use client'

import Head from 'next/head'
import { useRouter } from 'next/router'
import { decimalOffChain } from '@/modules/blockchain'
import { NFTTypeV2 } from '@/utils/lib/types'
import {
  useCheckApprovedForAllQuery,
  useGetSingleNFTQuery,
  useUserChainInfo,
} from '@/modules/query'
import { client } from '@/utils/configs'
import { MediaRenderer } from 'thirdweb/react'
import { Button, Loader } from '@/modules/app'
import { formatBlockchainTimestamp, getFormatAddress } from '@/utils'
import {
  useApprovedForAllMutation,
  useCreateListingMutation,
  useBuyFromDirectListingMutation,
  useCancelAuctionMutation,
  useCancelDirectListingMutation,
  useCollectAuctionPayoutMutation,
  useCollectAuctionTokensMutation,
  useCreateAuctionMutation,
  useBidInAuctionMutation,
  useMakeListingOfferMutation,
  useCancelOfferMutation,
} from '@/modules/mutation'
import { useEffect, useState } from 'react'
import { Dialog } from '@/modules/app/component/dialog'
import { NFTDialog } from '@/modules/components/nft-details'
import { useToast } from '@/modules/app/hooks/useToast'
import Link from 'next/link'

const NFTDetailPage = () => {
  const toast = useToast()
  const { activeAccount, activeWallet } = useUserChainInfo()
  const address = activeAccount?.address
  const chain = activeWallet?.getChain()
  const router = useRouter()
  const { contractAddress, nftType, tokenId } = router.query

  const [value, setValue] = useState('')
  const [buyOutAmount, setBuyOutAmount] = useState<string | undefined>(undefined)
  const [endTimestamp, setEndTimestamp] = useState<Date | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // mutation

  // auction
  const bidInAuctionMutation = useBidInAuctionMutation()
  const cancelAuctionMutation = useCancelAuctionMutation()
  const createAuctionMutation = useCreateAuctionMutation()
  const collectAuctionPayoutMutation = useCollectAuctionPayoutMutation()
  const collectAuctionTokensMutation = useCollectAuctionTokensMutation()

  // direct listing
  const cancelDirectListingMutation = useCancelDirectListingMutation()
  const buyFromDirectListingMutation = useBuyFromDirectListingMutation()
  const createListingMutation = useCreateListingMutation()
  const makeListingOfferMutation = useMakeListingOfferMutation()
  const cancelOfferMutation = useCancelOfferMutation()

  const approvedForAllMutation = useApprovedForAllMutation()

  // mutation

  const isTxPending =
    bidInAuctionMutation.isPending ||
    cancelAuctionMutation.isPending ||
    cancelDirectListingMutation.isPending ||
    buyFromDirectListingMutation.isPending ||
    createAuctionMutation.isPending ||
    createListingMutation.isPending ||
    approvedForAllMutation.isPending ||
    collectAuctionPayoutMutation.isPending ||
    collectAuctionTokensMutation.isPending ||
    makeListingOfferMutation.isPending

  const { data: isApproved } = useCheckApprovedForAllQuery({
    collectionContractAddress: contractAddress as string,
  })

  const {
    data: nftData,
    isLoading,
    isError,
  } = useGetSingleNFTQuery({
    contractAddress: contractAddress as string,
    nftType: nftType as NFTTypeV2,
    tokenId: tokenId as string,
  })

  const { id, isAuctionExpired, nft, nftAuctionList, winningBid, message, nftListingList, offers } =
    nftData || {}

  console.log({
    isAuctionExpired,
    nftAuctionList,
    winningBid,
    nft,
    id,
    message,
    nftListingList,
    offers,
  })

  const owner =
    id === 'listing' ? nft?.owner : id === 'auction' ? nftAuctionList?.auctionCreator : nft?.owner
  const isOwner = owner === address

  const handleApproveNFT = async () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')

    approvedForAllMutation.mutate({
      collectionContractAddress: contractAddress as string,
    })
  }

  const handleCreateListing = async () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (!value) return toast.error('Please enter a valid listing amount.')
    if (!endTimestamp) return toast.error('Please select an end date')

    createListingMutation.mutate(
      {
        directListing: {
          assetContract: contractAddress as string,
          tokenId: tokenId as string,
          quantity: '1',
          pricePerToken: value,
          endTimestamp: endTimestamp,
        },
      },
      {
        onSuccess: () => {
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handleCreateAuction = async () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (!value) return toast.error('Please enter a valid auction amount.')
    if (!buyOutAmount) return toast.error('Please enter a valid auction amount.')
    if (!endTimestamp) return toast.error('Please select an end date')

    createAuctionMutation.mutate(
      {
        auctionDetails: {
          assetContract: contractAddress as string,
          tokenId: tokenId as string,
          quantity: '1',
          minimumBidAmount: value,
          buyoutBidAmount: buyOutAmount,
          endTimestamp: endTimestamp,
        },
      },
      {
        onSuccess: () => {
          setBuyOutAmount('')
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setBuyOutAmount('')
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handlePlaceBidAuction = async () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (!value) return toast.error('Please enter a valid bid amount.')
    if (Number(value) < Number(decimalOffChain(winningBid?.bidAmount)))
      return toast.error('Bid amount should be greater than current winning')
    if (isOwner) return toast.error('Owner cant buy own listing')

    bidInAuctionMutation.mutate(
      {
        auctionId: nftAuctionList?.auctionId,
        bidAmount: value,
      },
      {
        onSuccess: () => {
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handleBuyOutDirectListing = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (isOwner) return toast.error('Owner cant buy own listing')

    buyFromDirectListingMutation.mutate(
      {
        buyFromListing: {
          buyFor: activeAccount?.address,
          listingId: nftListingList?.listingId,
          quantity: nftListingList?.quantity,
          nativeTokenValue: decimalOffChain(nftListingList?.pricePerToken),
          totalPrice: decimalOffChain(nftListingList?.pricePerToken),
        },
      },
      {
        onSuccess: () => {
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handleBuyOutAuction = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')

    bidInAuctionMutation.mutate(
      {
        auctionId: nftAuctionList?.auctionId,
        bidAmount: decimalOffChain(nftAuctionList?.buyoutBidAmount)!,
      },
      {
        onSuccess: () => {
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handleCancelDirectListing = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (!isOwner) return toast.error('Only the owner can cancel the listing.')

    cancelDirectListingMutation.mutate(
      { listingId: nftListingList?.listingId },
      {
        onSuccess: () => {
          setValue('')
        },
        onError: () => {
          setValue('')
        },
      },
    )
  }

  const handleCancelAuction = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (!isOwner) return toast.error('Only the owner can cancel the listing.')

    cancelAuctionMutation.mutate(
      { auctionId: nftAuctionList?.auctionId },
      {
        onSuccess: () => {
          setValue('')
        },
        onError: () => {
          setValue('')
        },
      },
    )
  }

  const handleClaimAuctionPayout = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (nftAuctionList?.auctionCreator === address)
      return toast.error('Only the auction creator can claim payout the listing.')

    collectAuctionPayoutMutation.mutate(
      { auctionId: nftAuctionList?.auctionId },
      {
        onSuccess: () => {
          setValue('')
        },
        onError: () => {
          setValue('')
        },
      },
    )
  }

  const handleClaimAuctionNFT = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (winningBid?.bidder !== address) return toast.error('Only bidder can claim the NFT')

    collectAuctionTokensMutation.mutate(
      { auctionId: nftAuctionList?.auctionId },
      {
        onSuccess: () => {
          setValue('')
        },
        onError: () => {
          setValue('')
        },
      },
    )
  }

  const handleMakeOffer = () => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')
    if (owner === address) return toast.error('Owner is not allowed make offer ')
    if (!value) return toast.error('Please enter a valid auction amount.')

    makeListingOfferMutation.mutate(
      {
        makeOffer: {
          assetContract: contractAddress as string,
          tokenId: tokenId as string,
          quantity: '1',
          totalPrice: value,
        },
      },
      {
        onSuccess: () => {
          setValue('')
          setIsDialogOpen(false)
        },
        onError: () => {
          setValue('')
          setIsDialogOpen(false)
        },
      },
    )
  }

  const handleCancelOffer = (offerId: string) => {
    if (!address) return toast.error('Please connect to a wallet.')
    if (chain?.id !== 4157) return toast.error('Please switch to CrossFi Testnet.')

    cancelOfferMutation.mutate({ offerId })
  }

  console.log('mutation status', makeListingOfferMutation)

  if (isLoading || isError) return <Loader />

  const imageUrl = nft?.metadata.image

  const getListingStatus = () => {
    if (id === 'listing') return { type: 'Fixed Price', color: 'text-green-500' }
    if (id === 'auction') return { type: 'English Auction', color: 'text-blue-500' }
    return { type: 'Not Listed', color: 'text-gray-500' }
  }

  return (
    <>
      <Head>
        <title>Mint Mingle Marketplace - {nft?.metadata?.name || 'NFT Details'}</title>
        <meta
          name="description"
          content={`Details for ${nft?.metadata?.name || 'NFT'} on Mint Mingle Marketplace`}
        />
      </Head>
      <div className="container h-full mx-auto items-start gap-8 md:px-14 px-4 max-md:flex-col justify-center flex mt-5 max-w-[1550px]">
        <div className="md:w-1/2 w-full">
          <div className="h-[500px] relative mb-8">
            <MediaRenderer
              client={client}
              src={nft?.metadata?.image || '/logo.svg'}
              className="rounded-2xl"
              style={{ maxHeight: '100%', width: '100%', height: '100%' }}
            />
          </div>

          {/* Traits Section */}
          <div className="bg-special-bg p-6 rounded-2xl mt-8">
            <h3 className="text-xl font-semibold mb-4">Traits</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {nft?.metadata?.attributes?.map(
                (trait: { trait_type: string; value: string }, index: number) => (
                  <div key={index} className="bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm text-gray-400 first-letter:uppercase">
                      {trait.trait_type}
                    </p>
                    <p className="font-semibold first-letter:uppercase">{trait.value}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 h-full md:w-1/2 w-full">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-bold">
                {nft?.metadata?.name} #{nft?.id}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getListingStatus().color}`}
              >
                {getListingStatus().type}
              </span>
            </div>
            <p className="text-gray-400">
              Owned by{' '}
              <Link
                href={`https://test.xfiscan.com/address/${
                  id === 'auction' ? nftAuctionList?.auctionCreator : nft?.owner
                }`}
                target="_blank"
                className="text-primary hover:underline cursor-pointer text-blue-500"
              >
                {getFormatAddress(id === 'auction' ? nftAuctionList?.auctionCreator : nft?.owner)}
              </Link>
            </p>
          </div>

          {/* Description Section */}
          <div className="bg-special-bg p-6 rounded-2xl">
            <h4 className="text-xl font-semibold mb-4">Description</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {nft?.metadata?.description || 'No description available'}
            </p>
          </div>

          {/* Details Information */}
          <div className="bg-special-bg p-6 rounded-2xl">
            <h3 className="text-xl font-semibold mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Contract Address</p>
                <p className="font-semibold">{getFormatAddress(contractAddress as string)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Token ID</p>
                <p className="font-semibold">{nft?.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Token Standard</p>
                <p className="font-semibold">CRC-721</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Chain</p>
                <p className="font-semibold">CrossFi</p>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-special-bg p-6 rounded-2xl">
            <h4 className="text-xl font-semibold mb-4">Pricing</h4>
            <div className="grid grid-cols-2 gap-4">
              {id === 'listing' && (
                <>
                  <div>
                    <p className="text-sm text-gray-400">Listing Price</p>
                    <p className="text-xl font-bold">
                      {decimalOffChain(nftListingList?.pricePerToken) || '0'} XFI
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Available From</p>
                    <p className="text-md font-semibold">
                      {formatBlockchainTimestamp(nftListingList?.startTimestamp)}
                    </p>
                  </div>
                </>
              )}
              {id === 'auction' && (
                <>
                  <div>
                    <p className="text-sm text-gray-400">Minimum Bid</p>
                    <p className="text-xl font-bold">
                      {decimalOffChain(nftAuctionList?.minimumBidAmount) || '0'} XFI
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Buyout Price</p>
                    <p className="text-xl font-bold">
                      {decimalOffChain(nftAuctionList?.buyoutBidAmount) || '0'} XFI
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Current Highest Bid</p>
                    <p className="text-xl font-bold">
                      {decimalOffChain(winningBid?.bidAmount) || 'No bids yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Auction Ends</p>
                    <p className="text-md font-semibold">
                      {formatBlockchainTimestamp(nftAuctionList?.endTimestamp)}
                    </p>
                  </div>
                </>
              )}
              {id === 'none' && (
                <div>
                  <p className="text-sm text-gray-400">No Listing found for this NFT</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-special-bg w-full p-6 flex items-center justify-center flex-col gap-6 rounded-2xl">
            {/* BUYER BUTTON */}
            {!isOwner && (
              <div className="flex items-center w-full gap-3 max-md:flex-col">
                {id === 'listing' && (
                  <Button
                    onClick={handleBuyOutDirectListing}
                    variant="secondary"
                    disabled={isTxPending}
                    className="text-sm font-medium h-8"
                  >
                    Buy Now
                  </Button>
                )}
                {id === 'auction' && (
                  <>
                    {isAuctionExpired ? (
                      <>
                        {winningBid?.bidder === address ? (
                          <>
                            {' '}
                            <Button
                              onClick={handleClaimAuctionNFT}
                              variant="secondary"
                              disabled={isTxPending}
                              className="text-sm font-medium h-8"
                            >
                              Claim Auction NFT
                            </Button>
                          </>
                        ) : (
                          <>
                            {winningBid?.bidder
                              ? 'Auction Has Been Completed'
                              : 'Auction Has Expired'}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center w-full max-md:flex-col gap-3">
                        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <Dialog.Trigger>
                            <Button variant="secondary" className="text-sm font-medium h-8">
                              Place Bid
                            </Button>
                          </Dialog.Trigger>
                          <Dialog.Content className="max-w-[690px] w-full p-6">
                            <NFTDialog
                              id={id}
                              nftList={nftAuctionList}
                              onClick={handlePlaceBidAuction}
                              onChange={setValue}
                              disabled={isTxPending}
                              value={value}
                              ctaText="Place Bid"
                              src={
                                imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '/logo.svg'
                              }
                              title={nft?.metadata?.name}
                            />
                          </Dialog.Content>
                        </Dialog.Root>
                        <Button
                          onClick={handleBuyOutAuction}
                          variant="secondary"
                          disabled={isTxPending}
                          className="text-sm font-medium h-8"
                        >
                          Buy Auction
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {(id === 'none' || id === 'listing') && (
                  <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Dialog.Trigger>
                      <Button variant="secondary" className="text-sm font-medium h-8">
                        Make Offer
                      </Button>
                    </Dialog.Trigger>
                    <Dialog.Content className="max-w-[690px] w-full p-6">
                      <NFTDialog
                        id={id}
                        type="make-offer"
                        value={value}
                        onChange={setValue}
                        onClick={handleMakeOffer}
                        disabled={isTxPending}
                        ctaText="Make Offer"
                        src={imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '/logo.svg'}
                        title={nft?.metadata?.name}
                      />
                    </Dialog.Content>
                  </Dialog.Root>
                )}
              </div>
            )}
            {/* BUYER BUTTON */}

            {/* SELLER BUTTON */}
            {isOwner && (
              <>
                {id === 'none' && (
                  <>
                    {!isApproved ? (
                      <Button
                        onClick={handleApproveNFT}
                        variant="secondary"
                        disabled={isTxPending}
                        className="text-sm font-medium h-8"
                      >
                        Approve Spending
                      </Button>
                    ) : (
                      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <Dialog.Trigger>
                          <Button
                            onClick={() => {}}
                            variant="secondary"
                            disabled={isTxPending}
                            className="text-sm font-medium h-8"
                          >
                            List/Auction
                          </Button>
                        </Dialog.Trigger>

                        <Dialog.Content className="max-w-[690px] w-full p-6">
                          <NFTDialog
                            id={id}
                            type="create"
                            nftList={nft}
                            setTimestamp={setEndTimestamp}
                            onClick={handleCreateListing}
                            secondaryOnClick={handleCreateAuction}
                            onChange={setValue}
                            onBuyOutChange={setBuyOutAmount}
                            buyOutValue={buyOutAmount}
                            disabled={isTxPending}
                            value={value}
                            src={
                              imageUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/') || '/logo.svg'
                            }
                            title={nft?.metadata?.name}
                          />
                        </Dialog.Content>
                      </Dialog.Root>
                    )}
                  </>
                )}
                {id === 'listing' && (
                  <Button
                    onClick={handleCancelDirectListing}
                    variant="secondary"
                    disabled={isTxPending}
                    className="text-sm font-medium h-8"
                  >
                    Cancel Direct Listing
                  </Button>
                )}
                {id === 'auction' && (
                  <>
                    {isAuctionExpired && nftAuctionList?.auctionCreator === address ? (
                      <Button
                        onClick={handleClaimAuctionPayout}
                        variant="secondary"
                        disabled={isTxPending}
                        className="text-sm font-medium h-8"
                      >
                        Claim Auction Payout
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCancelAuction}
                        variant="secondary"
                        disabled={isTxPending}
                        className="text-sm font-medium h-8"
                      >
                        Cancel Auction
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
            {/* SELLER BUTTON */}
          </div>

          {/* Recent Activity */}
          <div className="bg-special-bg p-6 rounded-2xl">
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            {/* Add your recent activity component here */}
            <p className="text-gray-400">No recent activity</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default NFTDetailPage
