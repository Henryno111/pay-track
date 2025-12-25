import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Buyer can create escrow successfully",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(1000), types.utf8("Test escrow")], buyer.address)
    ]);
    
    const escrowId = block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(escrowId, 1);
  },
});

Clarinet.test({
  name: "Escrow cannot be created with zero amount",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(0), 
         types.uint(1000), types.utf8("Zero escrow")], buyer.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(300); // Amount must be positive
  },
});

Clarinet.test({
  name: "Buyer cannot be the same as seller",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(wallet.address), types.uint(10000000), 
         types.uint(1000), types.utf8("Self escrow")], wallet.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(301); // Buyer cannot be seller
  },
});

Clarinet.test({
  name: "Escrow cannot be created with zero duration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(0), types.utf8("No duration")], buyer.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(302); // Duration must be positive
  },
});

Clarinet.test({
  name: "Escrow details are stored correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    const amount = 10000000;
    const duration = 1000;
    
    let createBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(amount), 
         types.uint(duration), types.utf8("Test transaction")], buyer.address)
    ]);
    
    createBlock.receipts[0].result.expectOk();
    
    // Get escrow details
    let getBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'get-escrow',
        [types.uint(1)], buyer.address)
    ]);
    
    const escrow = getBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(escrow['buyer'], buyer.address);
    assertEquals(escrow['seller'], seller.address);
    assertEquals(escrow['amount'], types.uint(amount));
    assertEquals(escrow['fee'], types.uint(300000)); // 3% of 10000000
    assertEquals(escrow['status'], 'active');
    assertEquals(escrow['description'], 'Test transaction');
  },
});

Clarinet.test({
  name: "Buyer can release escrow to seller",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(1000), types.utf8("Release test")], buyer.address),
      Tx.contractCall('escrow-service', 'release-escrow',
        [types.uint(1)], buyer.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    
    // Verify status changed to released
    let getBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'get-escrow',
        [types.uint(1)], buyer.address)
    ]);
    
    const escrow = getBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(escrow['status'], 'released');
  },
});

Clarinet.test({
  name: "Only buyer can release escrow",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    const other = accounts.get('wallet_3')!;
    
    let createBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(1000), types.utf8("Auth test")], buyer.address)
    ]);
    
    createBlock.receipts[0].result.expectOk();
    
    // Seller tries to release - should fail
    let sellerBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'release-escrow',
        [types.uint(1)], seller.address)
    ]);
    sellerBlock.receipts[0].result.expectErr().expectUint(304); // Only buyer can release
    
    // Other wallet tries to release - should fail
    let otherBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'release-escrow',
        [types.uint(1)], other.address)
    ]);
    otherBlock.receipts[0].result.expectErr().expectUint(304);
  },
});

Clarinet.test({
  name: "Escrow can be refunded after expiry",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let createBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(5), types.utf8("Refund test")], buyer.address)
    ]);
    
    createBlock.receipts[0].result.expectOk();
    
    // Try to refund before expiry - should fail
    let earlyRefundBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'refund-escrow',
        [types.uint(1)], buyer.address)
    ]);
    earlyRefundBlock.receipts[0].result.expectErr().expectUint(307); // Must be expired
    
    // Mine blocks to pass expiry
    chain.mineEmptyBlockUntil(createBlock.height + 6);
    
    // Refund after expiry - should succeed
    let refundBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'refund-escrow',
        [types.uint(1)], buyer.address)
    ]);
    refundBlock.receipts[0].result.expectOk();
    
    // Verify status changed to refunded
    let getBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'get-escrow',
        [types.uint(1)], buyer.address)
    ]);
    
    const escrow = getBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(escrow['status'], 'refunded');
  },
});

Clarinet.test({
  name: "Either buyer or seller can refund after expiry",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let createBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(5), types.utf8("Seller refund test")], buyer.address)
    ]);
    
    createBlock.receipts[0].result.expectOk();
    
    // Mine blocks to pass expiry
    chain.mineEmptyBlockUntil(createBlock.height + 6);
    
    // Seller initiates refund - should succeed
    let refundBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'refund-escrow',
        [types.uint(1)], seller.address)
    ]);
    refundBlock.receipts[0].result.expectOk();
  },
});

Clarinet.test({
  name: "Cannot release or refund already released escrow",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer = accounts.get('wallet_1')!;
    const seller = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller.address), types.uint(10000000), 
         types.uint(1000), types.utf8("Double action test")], buyer.address),
      Tx.contractCall('escrow-service', 'release-escrow',
        [types.uint(1)], buyer.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    
    // Try to release again - should fail
    let releaseAgainBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'release-escrow',
        [types.uint(1)], buyer.address)
    ]);
    releaseAgainBlock.receipts[0].result.expectErr().expectUint(305); // Must be active
    
    // Try to refund - should fail
    chain.mineEmptyBlockUntil(block.height + 1001);
    let refundBlock = chain.mineBlock([
      Tx.contractCall('escrow-service', 'refund-escrow',
        [types.uint(1)], buyer.address)
    ]);
    refundBlock.receipts[0].result.expectErr().expectUint(305); // Must be active
  },
});

Clarinet.test({
  name: "Multiple escrows can be created",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const buyer1 = accounts.get('wallet_1')!;
    const buyer2 = accounts.get('wallet_2')!;
    const seller1 = accounts.get('wallet_3')!;
    const seller2 = accounts.get('wallet_4')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller1.address), types.uint(5000000), 
         types.uint(500), types.utf8("Escrow 1")], buyer1.address),
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller2.address), types.uint(8000000), 
         types.uint(700), types.utf8("Escrow 2")], buyer2.address),
      Tx.contractCall('escrow-service', 'create-escrow',
        [types.principal(seller1.address), types.uint(3000000), 
         types.uint(300), types.utf8("Escrow 3")], buyer1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);
    block.receipts[2].result.expectOk().expectUint(3);
  },
});
