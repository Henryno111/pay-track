import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "User can register successfully",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectBool(true);
    
    // Verify total users incremented
    let getUsersBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'get-total-users', [], wallet1.address)
    ]);
    getUsersBlock.receipts[0].result.expectOk().expectUint(1);
  },
});

Clarinet.test({
  name: "User cannot register twice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address),
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice2")], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectErr().expectUint(100); // User already registered
  },
});

Clarinet.test({
  name: "User cannot register with empty username",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("")], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr().expectUint(101); // Username required
  },
});

Clarinet.test({
  name: "Get user details after registration",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk();
    
    // Read user data
    let readBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'get-user', 
        [types.principal(wallet1.address)], wallet1.address)
    ]);
    
    let userData = readBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(userData['username'], 'alice');
    assertEquals(userData['kyc-verified'], false);
    assertEquals(userData['reputation-score'], types.uint(100));
  },
});

Clarinet.test({
  name: "Only contract owner can verify KYC",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    
    // Register user
    let registerBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address)
    ]);
    registerBlock.receipts[0].result.expectOk();
    
    // Non-owner tries to verify - should fail
    let failBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'verify-kyc', 
        [types.principal(wallet1.address)], wallet2.address)
    ]);
    failBlock.receipts[0].result.expectErr().expectUint(103); // Only owner can verify
    
    // Owner verifies - should succeed
    let successBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'verify-kyc', 
        [types.principal(wallet1.address)], deployer.address)
    ]);
    successBlock.receipts[0].result.expectOk();
    
    // Check KYC status updated
    let checkBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'get-user', 
        [types.principal(wallet1.address)], wallet1.address)
    ]);
    let userData = checkBlock.receipts[0].result.expectSome().expectTuple();
    assertEquals(userData['kyc-verified'], true);
  },
});

Clarinet.test({
  name: "Multiple users can register",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;
    const wallet3 = accounts.get('wallet_3')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("alice")], wallet1.address),
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("bob")], wallet2.address),
      Tx.contractCall('user-registry', 'register-user', 
        [types.ascii("charlie")], wallet3.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk();
    
    // Verify total users
    let getUsersBlock = chain.mineBlock([
      Tx.contractCall('user-registry', 'get-total-users', [], wallet1.address)
    ]);
    getUsersBlock.receipts[0].result.expectOk().expectUint(3);
  },
});
