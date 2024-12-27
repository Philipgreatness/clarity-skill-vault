import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensures only owner can register skills",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      // Owner should succeed
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Programming"),
        types.ascii("Software development skills")
      ], deployer.address),
      // Non-owner should fail
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Design"),
        types.ascii("Design skills")
      ], user1.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectErr(types.uint(100)); // err-owner-only
  }
});

Clarinet.test({
  name: "Users can update skill progress and earn badges",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Setup skill and badge
    let setup = chain.mineBlock([
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Programming"),
        types.ascii("Software development skills")
      ], deployer.address),
      Tx.contractCall('skill-vault', 'create-badge', [
        types.uint(1), // skill-id
        types.uint(100), // required-progress
        types.ascii("Programming Master")
      ], deployer.address)
    ]);
    
    // Update progress
    let progressBlock = chain.mineBlock([
      Tx.contractCall('skill-vault', 'update-skill-progress', [
        types.uint(1), // skill-id
        types.uint(50)
      ], user1.address)
    ]);
    
    progressBlock.receipts[0].result.expectOk();
    
    // Check progress
    let readBlock = chain.mineBlock([
      Tx.contractCall('skill-vault', 'get-skill-progress', [
        types.principal(user1.address),
        types.uint(1)
      ], user1.address)
    ]);
    
    const progressResult = readBlock.receipts[0].result.expectOk();
    assertEquals(progressResult.progress, types.uint(50));
  }
});

Clarinet.test({
  name: "Cannot update progress to lower value",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Setup skill
    let setup = chain.mineBlock([
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Programming"),
        types.ascii("Software development skills")
      ], deployer.address),
    ]);
    
    // Set initial progress
    let progress1 = chain.mineBlock([
      Tx.contractCall('skill-vault', 'update-skill-progress', [
        types.uint(1),
        types.uint(50)
      ], user1.address)
    ]);
    
    // Try to lower progress
    let progress2 = chain.mineBlock([
      Tx.contractCall('skill-vault', 'update-skill-progress', [
        types.uint(1),
        types.uint(40)
      ], user1.address)
    ]);
    
    progress2.receipts[0].result.expectErr(types.uint(103)); // err-invalid-progress
  }
});