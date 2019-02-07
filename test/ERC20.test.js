// https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/token/ERC20/ERC20.test.js

const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');

// const ERC20Mock = artifacts.require('ERC20Mock');
const Hub = artifacts.require('Hub');
const Token = artifacts.require('Token');

const BigNumber = web3.utils.BN;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

contract('ERC20', function ([_, owner, recipient, anotherAccount, systemOwner]) {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  let hub = null;
  let token = null;

  const _issuance = new BigNumber(1736111111111111);
  const _demurrage = new BigNumber(0);
  const _decimals = new BigNumber(18);
  const _symbol = 'CRC';
  const _limitEpoch = new BigNumber(3600);
  const _tokenName = 'MyCoin';
  const _initialPayout = new BigNumber(100);

  // before(async () => {
  //   hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch);
  // })

  beforeEach(async () => {
    hub = await Hub.new(systemOwner, _issuance, _demurrage, _decimals, _symbol, _limitEpoch, _initialPayout);
    const signup = await hub.signup(_tokenName, { from: owner });// owner, 100);
    token = await Token.at(signup.logs[0].args.token);
  });

  describe('total supply', () => {
    it('returns the total amount of tokens', async () => {
      (await token.totalSupply()).should.be.bignumber.equal(new BigNumber(100));
    });
  });

  describe('balanceOf', () => {
    describe('when the requested account has no tokens', () => {
      it('returns zero', async () => {
        (await token.balanceOf(anotherAccount)).should.be.bignumber.equal(new BigNumber(0));
      });
    });

    describe('when the requested account has some tokens', () => {
      it('returns the total amount of tokens', async () => {
        (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(100));
      });
    });
  });

  describe('transfer', () => {
    describe('when the recipient is not the zero address', () => {
      const to = recipient;

      describe('when the sender does not have enough balance', () => {
        const amount = new BigNumber(101);

        it('reverts', async () => {
          await assertRevert(token.transfer(to, amount, { from: owner }));
        });
      });

      describe('when the sender has enough balance', () => {
        const amount = new BigNumber(100);

        it('transfers the requested amount', async () => {
          await token.transfer(to, amount, { from: owner });

          (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(0));

          (await token.balanceOf(to)).should.be.bignumber.equal(amount);
        });

        it('emits a transfer event', async () => {
          const { logs } = await token.transfer(to, amount, { from: owner });

          const event = expectEvent.inLogs(logs, 'Transfer', {
            from: owner,
            to: to,
          });

          event.args.value.should.be.bignumber.equal(amount);
        });
      });
    });

    describe('when the recipient is the zero address', () => {
      const to = ZERO_ADDRESS;
 //TODO? Not in the standard
      it('reverts', async () => {
        await assertRevert(token.transfer(to, 100, { from: owner }));
      });

    });
  });

  describe('approve', () => {
    describe('when the spender is not the zero address', () => {
      const spender = recipient;

      describe('when the sender has enough balance', () => {
        const amount = new BigNumber(100);

        it('emits an approval event', async () => {
          const { logs } = await token.approve(spender, amount, { from: owner });

          console.log(logs)
 
          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });

      describe('when the sender does not have enough balance', () => {
        const amount = new BigNumber(101);

        it('emits an approval event', async () => {
          const { logs } = await token.approve(spender, amount, { from: owner });

          logs.length.should.equal(1);
          logs[0].event.should.equal('Approval');
          logs[0].args.owner.should.equal(owner);
          logs[0].args.spender.should.equal(spender);
          logs[0].args.value.should.be.bignumber.equal(amount);
        });

        describe('when there was no approved amount before', () => {
          it('approves the requested amount', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });

        describe('when the spender had an approved amount', () => {
          beforeEach(async () => {
            await token.approve(spender, 1, { from: owner });
          });

          it('approves the requested amount and replaces the previous one', async () => {
            await token.approve(spender, amount, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(amount);
          });
        });
      });
    });

    describe('when the spender is the zero address', () => {
      const amount = new BigNumber(100);
      const spender = ZERO_ADDRESS;

//TODO? Not in the standard
      it('reverts', async () => {
        await assertRevert(token.approve(spender, amount, { from: owner }));
      });

    });
  });

  describe('transfer from', () => {
    const spender = recipient;

    describe('when the recipient is not the zero address', () => {
      const to = anotherAccount;

      describe('when the spender has enough approved balance', () => {
        beforeEach(async () => {
          await token.approve(spender, 100, { from: owner });
        });

        describe('when the owner has enough balance', () => {
          const amount = new BigNumber(100);

          it('transfers the requested amount', async () => {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.balanceOf(owner)).should.be.bignumber.equal(new BigNumber(0));

            (await token.balanceOf(to)).should.be.bignumber.equal(amount);
          });

          it('decreases the spender allowance', async () => {
            await token.transferFrom(owner, to, amount, { from: spender });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(0));
          });

          it('emits a transfer event', async () => {
            const { logs } = await token.transferFrom(owner, to, amount, { from: spender });

            console.log(logs)

            logs.length.should.equal(2);
            logs[0].event.should.equal('Transfer');
            logs[0].args.from.should.equal(owner);
            logs[0].args.to.should.equal(to);
            logs[0].args.value.should.be.bignumber.equal(amount);
            logs[1].event.should.equal('Approval');
            logs[1].args.owner.should.equal(owner);
            logs[1].args.spender.should.equal(spender);
            logs[1].args.value.should.be.bignumber.equal(new BigNumber(0));
          });
        });

        describe('when the owner does not have enough balance', () => {
          const amount = new BigNumber(101);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });

      describe('when the spender does not have enough approved balance', () => {
        beforeEach(async () => {
          await token.approve(spender, 99, { from: owner });
        });

        describe('when the owner has enough balance', () => {
          const amount = new BigNumber(100);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });

        describe('when the owner does not have enough balance', () => {
          const amount = new BigNumber(101);

          it('reverts', async () => {
            await assertRevert(token.transferFrom(owner, to, amount, { from: spender }));
          });
        });
      });
    });

    describe('when the recipient is the zero address', () => {
      const amount = new BigNumber(100);
      const to = ZERO_ADDRESS;

      beforeEach(async () => {
        await token.approve(spender, amount, { from: owner });
      });

/* TODO? Not in standard
      it('reverts', async function () {
        await assertRevert(this.token.transferFrom(owner, to, amount, { from: spender }));
      });
*/
    });
   });

// TODO? Not in standard
  describe('decrease allowance', () => {
    describe('when the spender is not the zero address', () => {
      const spender = recipient;

      function shouldDecreaseApproval (amount) {
        describe('when there was no approved amount before', () => {
          it('reverts', async () => {
            await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
          });
        });

        describe('when the spender had an approved amount', () => {
          const approvedAmount = amount;

          beforeEach(async function () {
            ({ logs: this.logs } = await token.approve(spender, approvedAmount, { from: owner }));
          });

          it('emits an approval event', async () => {
            const { logs } = await token.decreaseAllowance(spender, approvedAmount, { from: owner });

            logs.length.should.equal(1);
            logs[0].event.should.equal('Approval');
            logs[0].args.owner.should.equal(owner);
            logs[0].args.spender.should.equal(spender);
            logs[0].args.value.should.be.bignumber.equal(new BigNumber(0));
          });

          it('decreases the spender allowance subtracting the requested amount', async () => {
            await token.decreaseAllowance(spender, approvedAmount - 1, { from: owner });

            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(1));
          });

          it('sets the allowance to zero when all allowance is removed', async () => {
            await token.decreaseAllowance(spender, approvedAmount, { from: owner });
            (await token.allowance(owner, spender)).should.be.bignumber.equal(new BigNumber(0));
          });

          it('reverts when more than the full allowance is removed', async function () {
            await assertRevert(token.decreaseAllowance(spender, approvedAmount + 1, { from: owner }));
          });
        });
      }

      describe('when the sender has enough balance', function () {
        const amount = new BigNumber(100);

        shouldDecreaseApproval(amount);
      });

      describe('when the sender does not have enough balance', function () {
        const amount = new BigNumber(101);

        shouldDecreaseApproval(amount);
      });
    });

    describe('when the spender is the zero address', function () {
      const amount = new BigNumber(100);
      const spender = ZERO_ADDRESS;

      it('reverts', async function () {
        await assertRevert(token.decreaseAllowance(spender, amount, { from: owner }));
      });
    });
  });

  // describe('increase allowance', function () {
  //   const amount = 100;

  //   describe('when the spender is not the zero address', function () {
  //     const spender = recipient;

  //     describe('when the sender has enough balance', function () {
  //       it('emits an approval event', async function () {
  //         const { logs } = await this.token.increaseAllowance(spender, amount, { from: owner });

  //         logs.length.should.equal(1);
  //         logs[0].event.should.equal('Approval');
  //         logs[0].args.owner.should.equal(owner);
  //         logs[0].args.spender.should.equal(spender);
  //         logs[0].args.value.should.be.bignumber.equal(amount);
  //       });

  //       describe('when there was no approved amount before', function () {
  //         it('approves the requested amount', async function () {
  //           await this.token.increaseAllowance(spender, amount, { from: owner });

  //           (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
  //         });
  //       });

  //       describe('when the spender had an approved amount', function () {
  //         beforeEach(async function () {
  //           await this.token.approve(spender, 1, { from: owner });
  //         });

  //         it('increases the spender allowance adding the requested amount', async function () {
  //           await this.token.increaseAllowance(spender, amount, { from: owner });

  //           (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount + 1);
  //         });
  //       });
  //     });

    //   describe('when the sender does not have enough balance', function () {
    //     const amount = 101;

    //     it('emits an approval event', async function () {
    //       const { logs } = await this.token.increaseAllowance(spender, amount, { from: owner });

    //       logs.length.should.equal(1);
    //       logs[0].event.should.equal('Approval');
    //       logs[0].args.owner.should.equal(owner);
    //       logs[0].args.spender.should.equal(spender);
    //       logs[0].args.value.should.be.bignumber.equal(amount);
    //     });

    //     describe('when there was no approved amount before', function () {
    //       it('approves the requested amount', async function () {
    //         await this.token.increaseAllowance(spender, amount, { from: owner });

    //         (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount);
    //       });
    //     });

    //     describe('when the spender had an approved amount', function () {
    //       beforeEach(async function () {
    //         await this.token.approve(spender, 1, { from: owner });
    //       });

    //       it('increases the spender allowance adding the requested amount', async function () {
    //         await this.token.increaseAllowance(spender, amount, { from: owner });

    //         (await this.token.allowance(owner, spender)).should.be.bignumber.equal(amount + 1);
    //       });
    //     });
    //   });
    // });

  //   describe('when the spender is the zero address', function () {
  //     const spender = ZERO_ADDRESS;

  //     it('reverts', async function () {
  //       await assertRevert(this.token.increaseAllowance(spender, amount, { from: owner }));
  //     });
  //   });
  // });

  // describe('_mint', function () {
  //   const initialSupply = new BigNumber(100);
  //   const amount = new BigNumber(50);

  //   it('rejects a null account', async function () {
  //     await assertRevert(this.token.mint(ZERO_ADDRESS, amount));
  //   });

  //   describe('for a non null account', function () {
  //     beforeEach('minting', async function () {
  //       const { logs } = await this.token.mint(recipient, amount);
  //       this.logs = logs;
  //     });

  //     it('increments totalSupply', async function () {
  //       const expectedSupply = initialSupply.plus(amount);
  //       (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
  //     });

  //     it('increments recipient balance', async function () {
  //       (await this.token.balanceOf(recipient)).should.be.bignumber.equal(amount);
  //     });

  //     it('emits Transfer event', async function () {
  //       const event = expectEvent.inLogs(this.logs, 'Transfer', {
  //         from: ZERO_ADDRESS,
  //         to: recipient,
  //       });

  //       event.args.value.should.be.bignumber.equal(amount);
  //     });
  //   });
  // });

  // describe('_burn', function () {
  //   const initialSupply = new BigNumber(100);

  //   it('rejects a null account', async function () {
  //     await assertRevert(this.token.burn(ZERO_ADDRESS, 1));
  //   });

  //   describe('for a non null account', function () {
  //     it('rejects burning more than balance', async function () {
  //       await assertRevert(this.token.burn(owner, initialSupply.plus(1)));
  //     });

  //     const describeBurn = function (description, amount) {
  //       describe(description, function () {
  //         beforeEach('burning', async function () {
  //           const { logs } = await this.token.burn(owner, amount);
  //           this.logs = logs;
  //         });

  //         it('decrements totalSupply', async function () {
  //           const expectedSupply = initialSupply.minus(amount);
  //           (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
  //         });

  //         it('decrements owner balance', async function () {
  //           const expectedBalance = initialSupply.minus(amount);
  //           (await this.token.balanceOf(owner)).should.be.bignumber.equal(expectedBalance);
  //         });

  //         it('emits Transfer event', async function () {
  //           const event = expectEvent.inLogs(this.logs, 'Transfer', {
  //             from: owner,
  //             to: ZERO_ADDRESS,
  //           });

  //           event.args.value.should.be.bignumber.equal(amount);
  //         });
  //       });
  //     };

      // describeBurn('for entire balance', initialSupply);
      //describeBurn('for less amount than balance', initialSupply.sub(1));
  //   });
  // });

//   describe('_burnFrom', function () {
//     const initialSupply = new BigNumber(100);
//     const allowance = new BigNumber(70);

//     const spender = anotherAccount;

//     beforeEach('approving', async function () {
//       await this.token.approve(spender, allowance, { from: owner });
//     });

//     it('rejects a null account', async function () {
//       await assertRevert(this.token.burnFrom(ZERO_ADDRESS, 1));
//     });

//     describe('for a non null account', function () {
//       it('rejects burning more than allowance', async function () {
//         await assertRevert(this.token.burnFrom(owner, allowance.plus(1)));
//       });

//       it('rejects burning more than balance', async function () {
//         await assertRevert(this.token.burnFrom(owner, initialSupply.plus(1)));
//       });

//       const describeBurnFrom = function (description, amount) {
//         describe(description, function () {
//           beforeEach('burning', async function () {
//             const { logs } = await this.token.burnFrom(owner, amount, { from: spender });
//             this.logs = logs;
//           });

//           it('decrements totalSupply', async function () {
//             const expectedSupply = initialSupply.minus(amount);
//             (await this.token.totalSupply()).should.be.bignumber.equal(expectedSupply);
//           });

//           it('decrements owner balance', async function () {
//             const expectedBalance = initialSupply.minus(amount);
//             (await this.token.balanceOf(owner)).should.be.bignumber.equal(expectedBalance);
//           });

//           it('decrements spender allowance', async function () {
//             const expectedAllowance = allowance.minus(amount);
//             (await this.token.allowance(owner, spender)).should.be.bignumber.equal(expectedAllowance);
//           });

//           it('emits Transfer event', async function () {
//             const event = expectEvent.inLogs(this.logs, 'Transfer', {
//               from: owner,
//               to: ZERO_ADDRESS,
//             });

//             event.args.value.should.be.bignumber.equal(amount);
//           });
//         });
//       };

//       describeBurnFrom('for entire allowance', allowance);
//       //describeBurnFrom('for less amount than allowance', allowance.sub(1));
//     });
//   });

});
