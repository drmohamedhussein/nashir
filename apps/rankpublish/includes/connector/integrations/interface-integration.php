<?php
/**
 * Integration contract for embedded plugin engines.
 *
 * @package RankPublish
 */

declare(strict_types=1);

namespace RankPublish\Connector\Integrations;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adapter interface.
 */
interface Integration_Interface {

	public function id(): string;

	public function label(): string;

	public function is_available(): bool;

	public function version(): ?string;

	/**
	 * @return array<int, array<string, string>>
	 */
	public function capabilities(): array;

	/**
	 * @param array<string, mixed> $payload
	 * @return array<string, mixed>|\WP_Error
	 */
	public function handle_action( string $action, array $payload );
}
