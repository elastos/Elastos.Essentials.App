// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef __ELASTOS_SDK_ADDRESS_H__
#define __ELASTOS_SDK_ADDRESS_H__

#include <Common/typedefs.h>
#include <Common/uint256.h>

namespace Elastos {
	namespace ElaWallet {

		class Address {
		public:
			Address();

			explicit Address(const std::string &address);

			explicit Address(const uint168 &programHash);

			Address(Prefix prefix, const bytes_t &pubkey, bool did = false);

			Address(Prefix prefix, const std::vector<bytes_t> &pubkey, uint8_t m, bool did = false);

			Address(const Address &address);

			~Address();

			bool Valid() const;

			bool IsIDAddress() const;

			std::string String() const;

			const uint168 &ProgramHash() const;

			void SetProgramHash(const uint168 &programHash);

			SignType PrefixToSignType(Prefix prefix) const;

			const bytes_t &RedeemScript() const;

			void SetRedeemScript(Prefix prefix, const bytes_t &code);

			bool ChangePrefix(Prefix prefix);

			void ConvertToDID();

			bool operator<(const Address &address) const;

			bool operator==(const Address &address) const;

			bool operator==(const std::string &address) const;

			bool operator!=(const Address &address) const;

			bool operator!=(const std::string &address) const;

			Address &operator=(const Address &address);

		private:

			void GenerateCode(Prefix prefix, const std::vector<bytes_t> &pubkeys, uint8_t m, bool did = false);

			void GenerateProgramHash(Prefix prefix);

			bool CheckValid();

		};

		typedef boost::shared_ptr<Address> AddressPtr;
		typedef struct _AddressCompare {
			bool operator() (const Address &x, const Address &y) const {
				return x < y;
			}
		} AddressCompare;
		typedef std::set<Address, AddressCompare> AddressSet;

	}
}


#endif //__ELASTOS_SDK_ADDRESS_H__
