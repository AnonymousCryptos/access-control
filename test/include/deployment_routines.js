/**
 * Deploys USDT token, used to test non ERC20 compliant transfer function
 * (doesn't return any value on successful operation)
 *
 * @param a0 smart contract owner
 * @param H0 initial token holder address
 * @returns USDT ERC20 instance
 */
async function deploy_usdt(a0, H0 = a0) {
	// smart contracts required
	const USDTContract = artifacts.require("TetherToken");

	// deploy the token
	const token = await USDTContract.new(0, "Tether USD", "USDT", 6, {from: a0});

	// move the initial supply if required
	if(H0 !== a0) {
		await token.transfer(H0, S0, {from: a0});
	}

	// return the reference
	return token;
}

/**
 * Deploys AccessControl contract
 *
 * @param a0 smart contract deployer, owner, super admin
 * @returns AccessControl instance
 */
async function deploy_access_control(a0) {
	// deploy AccessControlMock
	const AccessControlMock = artifacts.require("AccessControlMock");

	// deploy and return the instance
	return await AccessControlMock.new(a0, {from: a0});
}

/**
 * Deploys OwnableToAccessControlAdapter
 * Deploys OZ Ownable contract (TetherToken) if target is not specified
 * Transfers the ownership on the ownable to the adapter
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param target target OZ Ownable contract address or instance, optional
 * @returns OwnableToAccessControlAdapter instance
 */
async function deploy_ownable_to_ac_adapter(a0, target) {
	// deploy the target if required
	if(!target) {
		target = await deploy_usdt(a0);
	}
	// wrap the target into the Ownable if required
	else if(!target.address) {
		const Ownable = artifacts.require("contracts/AdapterFactory.sol:Ownable");
		target = await Ownable.at(target);
	}

	// deploy adapter
	const adapter = await deploy_no_deps_ownable_to_ac_adapter(a0, target);

	// transfer ownership to the adapter
	await target.transferOwnership(adapter.address, {from: a0});

	// return both instances
	return {target, adapter};
}

/**
 * Deploys OwnableToAccessControlAdapter
 *
 * @param a0 smart contract deployer, owner, super admin
 * @param target target OZ Ownable contract address or instance, required
 * @returns OwnableToAccessControlAdapter instance
 */
async function deploy_no_deps_ownable_to_ac_adapter(a0, target) {
	// artifacts in use
	const OwnableToAccessControlAdapter = artifacts.require("OwnableToAccessControlAdapter");
	// deploy and return the deployd instance
	return await OwnableToAccessControlAdapter.new(target.address || target, a0, {from: a0});
}

/**
 * Deploys the AdapterFactory
 *
 * @param a0 deployer address, optional
 * @returns AdapterFactory instance
 */
async function deploy_adapter_factory(a0) {
	// artifacts in use
	const AdapterFactory = artifacts.require("AdapterFactory");
	// deploy and return the deployd instance
	return await AdapterFactory.new(a0? {from: a0}: undefined);
}

/**
 * Deploys OwnableToAccessControlAdapter via the AdapterFactory
 * Deploys the AdapterFactory and target Ownable if required
 *
 * @param a0 deployer address, target owner, required
 * @param factory AdapterFactory instance or address, optional
 * @param target Ownable instance or address, optional
 * @returns OwnableToAccessControlAdapter instance
 */
async function factory_deploy_ownable_to_ac_adapter(a0, factory, target) {
	if(!factory) {
		factory = await deploy_adapter_factory(a0);
	}
	else if(!factory.address) {
		const AdapterFactory = artifacts.require("AdapterFactory");
		factory = await AdapterFactory.at(factory);
	}

	if(!target) {
		target = await deploy_usdt(a0);
	}
	else if(!target.address) {
		const Ownable = artifacts.require("contracts/AdapterFactory.sol:Ownable");
		target = await Ownable.at(target);
	}

	// deploy the adapter via the AdapterFactory
	const receipt = await factory.deployNewOwnableToAccessControlAdapter(target.address, {from: a0});
	const {
		adapterAddress,
		ownableTargetAddress,
	} = receipt.logs.find(log => log.event === "NewOwnableToAccessControlAdapterDeployed").args;

	// connect to the adapter
	const OwnableToAccessControlAdapter = artifacts.require("OwnableToAccessControlAdapter");
	const adapter = await OwnableToAccessControlAdapter.at(adapterAddress);

	// transfer ownership to the adapter
	await target.transferOwnership(adapter.address, {from: a0});

	// return the results
	return {factory, target, adapter};
}

// export public deployment API
module.exports = {
	deploy_usdt,
	deploy_access_control,
	deploy_no_deps_ownable_to_ac_adapter,
	deploy_ownable_to_ac_adapter,
	deploy_adapter_factory,
	factory_deploy_ownable_to_ac_adapter,
}
