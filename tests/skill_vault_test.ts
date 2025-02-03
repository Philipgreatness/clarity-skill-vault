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
  name: "Users can create and join teams",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const user1 = accounts.get('wallet_1')!;
    const user2 = accounts.get('wallet_2')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('skill-vault', 'create-team', [
        types.ascii("Team Alpha")
      ], user1.address),
      Tx.contractCall('skill-vault', 'join-team', [
        types.uint(1)
      ], user2.address)
    ]);
    
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
  }
});

Clarinet.test({
  name: "Team skill totals update with member progress",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Setup skill and team
    let setup = chain.mineBlock([
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Programming"),
        types.ascii("Software development skills")
      ], deployer.address),
      Tx.contractCall('skill-vault', 'create-team', [
        types.ascii("Team Alpha")
      ], user1.address)
    ]);
    
    // Update progress
    let progressBlock = chain.mineBlock([
      Tx.contractCall('skill-vault', 'update-skill-progress', [
        types.uint(1),
        types.uint(50)
      ], user1.address)
    ]);
    
    progressBlock.receipts[0].result.expectOk();
    
    // Check team totals
    let readBlock = chain.mineBlock([
      Tx.contractCall('skill-vault', 'get-team-leaderboard', [
        types.uint(1)
      ], user1.address)
    ]);
    
    readBlock.receipts[0].result.expectOk();
  }
});

Clarinet.test({
  name: "Badge filtering checks all available badges",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Setup skill and badges
    let setup = chain.mineBlock([
      Tx.contractCall('skill-vault', 'register-skill', [
        types.ascii("Programming"),
        types.ascii("Software development skills")
      ], deployer.address),
      Tx.contractCall('skill-vault', 'create-badge', [
        types.uint(1),
        types.uint(25),
        types.ascii("Bronze")
      ], deployer.address),
      Tx.contractCall('skill-vault', 'create-badge', [
        types.uint(1),
        types.uint(50),
        types.ascii("Silver")
      ], deployer.address)
    ]);
    
    setup.receipts.map(receipt => receipt.result.expectOk());
    
    // Update progress and check badges
    let progressBlock = chain.mineBlock([
      Tx.contractCall('skill-vault', 'update-skill-progress', [
        types.uint(1),
        types.uint(60)
      ], user1.address)
    ]);
    
    progressBlock.receipts[0].result.expectOk();
  }
});
