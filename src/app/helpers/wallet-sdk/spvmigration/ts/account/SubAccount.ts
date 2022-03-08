/*
 * Copyright (c) 2019 Elastos Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ByteStream } from "../common/bytestream";
import { Error, ErrorChecker } from "../common/ErrorChecker";
import { Log } from "../common/Log";
import { Transaction } from "../transactions/Transaction";
import { bytes_t, uint256, uint32_t } from "../types";
import { Address, AddressArray, SignType } from "../walletcore/Address";
import { Account } from "./Account";

export class SubAccount {
    // mutable std::map<uint32_t, AddressArray>
    private _chainAddressCached: {
        [index: uint32_t]: AddressArray;
    } = {};
    private _depositAddress: Address;
    private _ownerAddress: Address;
    private _crDepositAddress: Address;

    private _parent: Account;

    /* SubAccount::SubAccount(const AccountPtr &parent) :
        _parent(parent) {

        _chainAddressCached[SEQUENCE_EXTERNAL_CHAIN] = {};
        _chainAddressCached[SEQUENCE_INTERNAL_CHAIN] = {};

        if (_parent->GetSignType() != Account::MultiSign) {
            bytes_t ownerPubKey = _parent->OwnerPubKey();
            _depositAddress = Address(PrefixDeposit, ownerPubKey);
            _ownerAddress = Address(PrefixStandard, ownerPubKey);

            HDKeychainPtr mpk = _parent->MasterPubKey();
            _crDepositAddress = Address(PrefixDeposit, mpk->getChild(0).getChild(0).pubkey());
        }
    }

    SubAccount::~SubAccount() {

    }

    nlohmann::json SubAccount::GetBasicInfo() const {
        nlohmann::json j;
        j["Account"] = _parent->GetBasicInfo();
        return j;
    }

    bool SubAccount::IsSingleAddress() const {
        return _parent->SingleAddress();
    }

    bool SubAccount::IsProducerDepositAddress(const Address &address) const {
        return _depositAddress.Valid() && _depositAddress == address;
    }

    bool SubAccount::IsOwnerAddress(const Address &address) const {
        return _ownerAddress.Valid() && _ownerAddress == address;
    }

    bool SubAccount::IsCRDepositAddress(const Address &address) const {
        return _crDepositAddress.Valid() && _crDepositAddress == address;
    }

    void SubAccount::GetCID(AddressArray &cids, uint32_t index, size_t count, bool internal) const {
        if (_parent->GetSignType() != IAccount::MultiSign) {
            AddressArray addresses;
            GetAddresses(addresses, index, count, internal);

            for (Address addr : addresses) {
                Address cid(addr);
                cid.ChangePrefix(PrefixIDChain);
                cids.push_back(cid);
            }
        }
    }

    void SubAccount::GetPublickeys(nlohmann::json &jout, uint32_t index, size_t count, bool internal) const {
        if (_parent->SingleAddress()) {
            index = 0;
            count = 1;
            internal = false;
        }

        uint32_t chain = internal ? SEQUENCE_INTERNAL_CHAIN : SEQUENCE_EXTERNAL_CHAIN;
        if (_parent->GetSignType() == Account::MultiSign) {
            std::vector<HDKeychain> allKeychains;
            HDKeychain mineKeychain;

            if (count > 0) {
                for (const HDKeychainPtr &keychain : _parent->MultiSignCosigner())
                    allKeychains.push_back(keychain->getChild(chain));
                mineKeychain = _parent->MultiSignSigner()->getChild(chain);
            }

            if (allKeychains.empty()) {
                count = 0;
                Log::error("keychains is empty when derivate address");
            }

            jout["m"] = _parent->GetM();
            nlohmann::json jpubkeys;
            while (count--) {
                std::vector<std::string> pubkeys;
                nlohmann::json j;
                for (const HDKeychain &signer : allKeychains)
                    pubkeys.push_back(signer.getChild(index).pubkey().getHex());

                j["me"] = mineKeychain.getChild(index).pubkey().getHex();
                j["all"] = pubkeys;
                jpubkeys.push_back(j);
                index++;
            }
            jout["pubkeys"] = jpubkeys;
        } else {
            HDKeychain keychain = _parent->MasterPubKey()->getChild(chain);

            while (count--)
                jout.push_back(keychain.getChild(index++).pubkey().getHex());
        }
    }*/

    public GetAddresses(addresses: AddressArray /* (out TODO) */, index: uint32_t, count: uint32_t, internal: boolean) {
        if (this._parent.SingleAddress()) {
            index = 0;
            count = 1;
            internal = false;
        }

        /*
        TODO

        let chain: uint32_t = internal ? SEQUENCE_INTERNAL_CHAIN : SEQUENCE_EXTERNAL_CHAIN;
        AddressArray &addrChain = _chainAddressCached[chain];
        uint32_t derivateCount = (index + count > addrChain.size()) ? (index + count - addrChain.size()) : 0;

        if (_parent->GetSignType() == Account::MultiSign) {
            std::vector<HDKeychain> keychains;

            if (derivateCount > 0)
                for (const HDKeychainPtr &keychain : _parent->MultiSignCosigner())
                    keychains.push_back(keychain->getChild(chain));

            if (keychains.empty()) {
                derivateCount = 0;
                Log::error("keychains is empty when derivate address");
            }

            while (derivateCount--) {
                std::vector<bytes_t> pubkeys;
                for (const HDKeychain &signer : keychains)
                    pubkeys.push_back(signer.getChild(addrChain.size()).pubkey());

                Address addr(PrefixMultiSign, pubkeys, _parent->GetM());
                if (!addr.Valid()) {
                    Log::error("derivate invalid multi-sig address");
                    break;
                }
                addrChain.push_back(addr);
            }
        } else {
            HDKeychain keychain = _parent->MasterPubKey()->getChild(chain);

            while (derivateCount--) {
                Address addr(PrefixStandard, keychain.getChild(addrChain.size()).pubkey());
                if (!addr.Valid()) {
                    Log::error("derivate invalid address");
                    break;
                }
                addrChain.push_back(addr);
            }
        }
        addresses.assign(addrChain.begin() + index, addrChain.begin() + index + count); */
    }

    /*bytes_t SubAccount::OwnerPubKey() const {
        return _parent->OwnerPubKey();
    }

    bytes_t SubAccount::DIDPubKey() const {
        return _parent->MasterPubKey()->getChild(0).getChild(0).pubkey();
    }

    bool SubAccount::FindPrivateKey(Key &key, SignType type, const std::vector<bytes_t> &pubkeys, const std::string &payPasswd) const {
        HDKeychainPtr root = _parent->RootKey(payPasswd);
        // for special path
        if (_parent->GetSignType() != Account::MultiSign) {
            for (const bytes_t &pubkey : pubkeys) {
                if (pubkey == _parent->OwnerPubKey()) {
                    key = root->getChild("44'/0'/1'/0/0");
                    return true;
                }
            }
        }

        std::vector<HDKeychain> bipkeys;
        bipkeys.push_back(root->getChild("44'/0'/0'"));
        if (type == SignTypeMultiSign) {
            HDKeychain bip45 = root->getChild("45'");
            if (_parent->GetSignType() == Account::MultiSign) {
                bipkeys.push_back(bip45.getChild(_parent->CosignerIndex()));
            } else {
                for (uint32_t index = 0; index < MAX_MULTISIGN_COSIGNERS; ++index)
                    bipkeys.push_back(bip45.getChild(index));
            }
        }

        for (HDKeychain &bipkey : bipkeys) {
            for (auto & it : _chainAddressCached) {
                uint32_t chain = it.first;
                HDKeychain bipkeyChain = bipkey.getChild(chain);
                for (uint32_t index = it.second.size(); index > 0; index--) {
                    HDKeychain bipkeyIndex = bipkeyChain.getChild(index - 1);
                    for (const bytes_t &p : pubkeys) {
                        if (bipkeyIndex.pubkey() == p) {
                            key = bipkeyIndex;
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }*/

    public signTransaction(tx: Transaction, payPasswd: string) {
        let addr: string;
        let key: Key;
        let signature: bytes_t;
        let stream = new ByteStream();

        ErrorChecker.CheckParam(this._parent.Readonly(), Error.Code.Sign, "Readonly wallet can not sign tx");
        ErrorChecker.CheckParam(tx.isSigned(), Error.Code.AlreadySigned, "Transaction signed");
        ErrorChecker.CheckParam(!tx.getPrograms(), Error.Code.InvalidTransaction, "Invalid transaction program");

        let md: uint256 = tx.getShaData();

        let programs = tx.getPrograms();
        for (let i = 0; i < programs.length; ++i) {
            std:: vector < bytes_t > publicKeys;
            let type: SignType = programs[i].decodePublicKey(publicKeys);
            ErrorChecker.CheckLogic(type != SignType.SignTypeMultiSign && type != SignType.SignTypeStandard, Error.Code.InvalidArgument, "Invalid redeem script");

            let found = this.findPrivateKey(key, type, publicKeys, payPasswd);
            ErrorChecker.CheckLogic(!found, Error.Code.PrivateKeyNotFound, "Private key not found");

            stream.reset();
            if (programs[i].getParameter().length > 0) {
                let verifyStream = new ByteStream(programs[i].getParameter());
                while (verifyStream.readVarBytes(signature)) {
                    ErrorChecker.CheckLogic(key.Verify(md, signature), Error.Code.AlreadySigned, "Already signed");
                }
                stream.writeBytes(programs[i].getParameter());
            }

            signature = key.sign(md);
            stream.writeVarBytes(signature);
            programs[i].setParameter(stream.getBytes());
        }
    }

    /*Key SubAccount::GetKeyWithAddress(const Address &addr, const std::string &payPasswd) const {
        if (_parent->GetSignType() != IAccount::MultiSign) {
            for (auto it = _chainAddressCached.begin(); it != _chainAddressCached.end(); ++it) {
                uint32_t chain = it->first;
                AddressArray &chainAddr = it->second;
                for (uint32_t i = 0; i < chainAddr.size(); ++i) {
                    Address cid(chainAddr[i]);
                    cid.ChangePrefix(PrefixIDChain);

                    Address did(cid);
                    did.ConvertToDID();

                    if (addr == chainAddr[i] || addr == cid || addr == did) {
                        return _parent->RootKey(payPasswd)->getChild("44'/0'/0'").getChild(chain).getChild(i);
                    }
                }
            }
        }

        ErrorChecker::ThrowLogicException(Error::PrivateKeyNotFound, "private key not found");
        return Key();
    }

    Key SubAccount::DeriveOwnerKey(const std::string &payPasswd) {
        // 44'/coinIndex'/account'/change/index
        return _parent->RootKey(payPasswd)->getChild("44'/0'/1'/0/0");
    }

    Key SubAccount::DeriveDIDKey(const std::string &payPasswd) {
        return _parent->RootKey(payPasswd)->getChild("44'/0'/0'/0/0");
    }
*/
    GetCode(addr: Address, code: bytes_t): boolean {
        let index: uint32_t;
        let pubKey: bytes_t;

        if (this.IsProducerDepositAddress(addr)) {
            // "44'/0'/1'/0/0";
            code = _depositAddress.RedeemScript();
            return true;
        }

        if (this.IsOwnerAddress(addr)) {
            // "44'/0'/1'/0/0";
            code = _ownerAddress.RedeemScript();
            return true;
        }

        if (this.IsCRDepositAddress(addr)) {
            // "44'/0'/0'/0/0";
            code = _crDepositAddress.RedeemScript();
            return true;
        }

        for (let chainAddr of Object.values(this._chainAddressCached)) {
            for (index = chainAddr.length; index > 0; index--) {
                if (chainAddr[index - 1] == addr) {
                    code = chainAddr[index - 1].RedeemScript();
                    return true;
                }

                if (this._parent.GetSignType() != IAccount.MultiSign) {
                    let cid = Address.newFromAddress(chainAddr[index - 1]);
                    cid.ChangePrefix(PrefixIDChain);
                    if (addr == cid) {
                        code = cid.RedeemScript();
                        return true;
                    }

                    let did = Address.newFromAddress(cid);
                    did.ConvertToDID();
                    if (addr == did) {
                        code = did.RedeemScript();
                        return true;
                    }
                }
            }
        }

        Log.error("Can't found code and path for address {}", addr.String());

        return false;
    }
    /*
        AccountPtr SubAccount::Parent() const {
            return _parent;
        }
    */
}
