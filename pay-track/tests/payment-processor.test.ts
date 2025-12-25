import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "User can send payment successfully",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(1000000), 
         types.utf8("test payment")], sender.address)
    ]);
    
    const paymentId = block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(paymentId, 1);
  },
});

Clarinet.test({
  name: "Payment cannot be sent with zero amount",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(0), 
         types.utf8("zero payment")], sender.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(200); // Amount must be positive
  },
});

Clarinet.test({
  name: "User cannot send payment to self",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(wallet.address), types.uint(1000000), 
         types.utf8("self payment")], wallet.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(201); // Cannot send to self
  },
});

Clarinet.test({
  name: "Payment history is recorded correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    const amount = 1000000;
    
    let sendBlock = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(amount), 
         types.utf8("test payment")], sender.address)
    ]);
    
    const paymentId = sendBlock.receipts[0].result.expectOk();
    
    // Get payment details
    let getBlock = chain.mineBlock([
      Tx.contractCall('payment-processor', 'get-payment',
        [types.uint(1)], sender.address)
    ]);
    
    const payment = getBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(payment['sender'], sender.address);
    assertEquals(payment['recipient'], recipient.address);
    assertEquals(payment['amount'], types.uint(amount));
    assertEquals(payment['fee'], types.uint(20000)); // 2% of 1000000
    assertEquals(payment['status'], 'completed');
  },
});

Clarinet.test({
  name: "Platform fees are calculated and collected correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    const amount = 1000000; // 1 STX in microSTX
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(amount), 
         types.utf8("fee test")], sender.address)
    ]);
    
    block.receipts[0].result.expectOk();
    
    // Check total fees collected
    let feesBlock = chain.mineBlock([
      Tx.contractCall('payment-processor', 'get-total-fees', [], sender.address)
    ]);
    
    feesBlock.receipts[0].result.expectOk().expectUint(20000); // 2% of 1000000
  },
});

Clarinet.test({
  name: "Multiple payments increment payment counter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient1 = accounts.get('wallet_2')!;
    const recipient2 = accounts.get('wallet_3')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient1.address), types.uint(1000000), 
         types.utf8("payment 1")], sender.address),
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient2.address), types.uint(2000000), 
         types.utf8("payment 2")], sender.address),
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient1.address), types.uint(500000), 
         types.utf8("payment 3")], sender.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[1].result.expectOk().expectUint(2);
    block.receipts[2].result.expectOk().expectUint(3);
  },
});

Clarinet.test({
  name: "Payment with very small amount still deducts fee",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    const amount = 100; // Very small amount
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(amount), 
         types.utf8("small payment")], sender.address)
    ]);
    
    block.receipts[0].result.expectOk();
    
    // Get payment to verify fee
    let getBlock = chain.mineBlock([
      Tx.contractCall('payment-processor', 'get-payment',
        [types.uint(1)], sender.address)
    ]);
    
    const payment = getBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(payment['fee'], types.uint(2)); // 2% of 100
    assertEquals(payment['amount'], types.uint(100));
  },
});

Clarinet.test({
  name: "Total fees accumulate across multiple payments",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const sender = accounts.get('wallet_1')!;
    const recipient = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(1000000), 
         types.utf8("payment 1")], sender.address),
      Tx.contractCall('payment-processor', 'send-payment',
        [types.principal(recipient.address), types.uint(2000000), 
         types.utf8("payment 2")], sender.address)
    ]);
    
    // Check total fees: 2% of 1000000 + 2% of 2000000 = 20000 + 40000 = 60000
    let feesBlock = chain.mineBlock([
      Tx.contractCall('payment-processor', 'get-total-fees', [], sender.address)
    ]);
    
    feesBlock.receipts[0].result.expectOk().expectUint(60000);
  },
});
